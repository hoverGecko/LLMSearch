import axios, { AxiosRequestConfig } from 'axios';
import * as dotenv from 'dotenv';
import * as fs from 'node:fs/promises';
import path from 'node:path';
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions'; // Adjust import if needed
import OpenRouterCompletor, { OpenRouterModel } from './completors/OpenRouterCompletor'; // Import OpenRouterModel type
import searchPromptSet from "./prompts/searchPromptSet"; // Correct import for default export

// https://stackoverflow.com/questions/64383909/dirname-is-not-defined-error-in-node-js-14-version
import { dirname } from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '.env') });

const {
    USER_EMAIL,
    USER_PASSWORD,
    LLM_SEARCH_URL,
    OPEN_ROUTER_API_KEY
} = process.env;

/* --- CONFIGURATION --- */
const TOP_N_RESULTS = 5; // Number of search results to process for partial summaries
const OUTPUT_DIR = path.join(__dirname, 'results'); // Directory to save results
const JUDGE_MODEL: OpenRouterModel = 'deepseek/deepseek-chat'; // Model used for judging
const BASELINE_MODELS: OpenRouterModel[] = [
    'google/gemini-2.0-flash-001',
    'meta-llama/llama-4-maverick',
    'openai/gpt-4o-2024-05-13'
];
const EVALUATE_LLM_SEARCH = true; // Include llmsearch evluation only if set to true
/* --- CONFIGURATION ENDS --- */

interface WebPage {
    id: string;
    name: string;
    url: string;
    isFamilyFriendly: boolean;
    displayUrl: string;
    snippet: string;
    dateLastCrawled: string;
    language: string;
    isNavigational: boolean;
}

interface SearchResult {
    _type: string;
    queryContext: { originalQuery: string };
    webPages?: { value: WebPage[] };
    // Add other fields if necessary based on actual API response
}

interface PartialSummaryResponse {
    partialSummary: string | null;
    error?: string;
}

interface GeneralSummaryResponse {
    generalSummary: string;
    initialChatHistory?: ChatCompletionMessageParam[]; // Optional based on backend handler
    error?: string;
}

interface LoginResponse {
    token: string;
    error?: string;
}

interface ScoreDetail {
    score: number | null;
    explanation: string | null;
    error?: string; // Store errors during judging
}

interface ModelEvaluationResult {
    model: string;
    summary: string | null;
    error?: string; // Store errors during summary generation
    scores: {
        relevance: ScoreDetail;
        conciseness: ScoreDetail;
        completeness: ScoreDetail;
    };
}

interface QueryEvaluationResult {
    query: string;
    promptType: string;
    results: ModelEvaluationResult[];
}

/* --- Loading prompts --- */
interface LoadedPrompts {
    baselineSystem: string;
    judgeRelevance: string;
    judgeConciseness: string;
    judgeCompleteness: string;
}
const PROMPT_PATHS = {
    searchPrompt: path.join(__dirname, 'prompts', 'search_prompt.txt'),
    judgeRelevance: path.join(__dirname, 'prompts', 'judge_relevance.txt'),
    judgeConciseness: path.join(__dirname, 'prompts', 'judge_conciseness.txt'),
    judgeCompleteness: path.join(__dirname, 'prompts', 'judge_completeness.txt'),
};
async function loadPrompts(): Promise<LoadedPrompts> {
    try {
        console.log("Attempting to load prompts from:");
        console.log(`  Search prompt: ${PROMPT_PATHS.searchPrompt}`);
        console.log(`  Relevance: ${PROMPT_PATHS.judgeRelevance}`);
        console.log(`  Conciseness: ${PROMPT_PATHS.judgeConciseness}`);
        console.log(`  Completeness: ${PROMPT_PATHS.judgeCompleteness}`);

        const [baselineSystem, judgeRelevance, judgeConciseness, judgeCompleteness] = await Promise.all([
            fs.readFile(PROMPT_PATHS.searchPrompt, 'utf-8'),
            fs.readFile(PROMPT_PATHS.judgeRelevance, 'utf-8'),
            fs.readFile(PROMPT_PATHS.judgeConciseness, 'utf-8'),
            fs.readFile(PROMPT_PATHS.judgeCompleteness, 'utf-8'),
        ]);
        console.log("Successfully loaded prompts from files.");
        return { baselineSystem, judgeRelevance, judgeConciseness, judgeCompleteness };
    } catch (error: any) {
        console.error(`Error loading prompts from files (path: ${error.path}):`, error.message);
        throw new Error(`Failed to load required prompt file(s). Check paths and permissions. Error path: ${error.path}`);
    }
}
// global variable
let loadedPrompts: LoadedPrompts;
// Load prompts first and assign to the global variable
try {
    loadedPrompts = await loadPrompts();
} catch (e: any) {
    console.error("Evaluation cannot proceed without prompts.", e.message);
    process.exit(1);
}
/* --- Loading prompts end --- */


// Sleep function to avoid hitting rate limit of APIs
async function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}
/* ---  Fetch LLMSearch general summary --- */
let jwtToken: string | null = null;

async function login(): Promise<string> {
    if (jwtToken) return jwtToken;
    if (!USER_EMAIL || !USER_PASSWORD || !LLM_SEARCH_URL) {
        throw new Error('Missing USER_EMAIL, USER_PASSWORD, or LLM_SEARCH_URL environment variables.');
    }
    console.log('Logging in...');
    const response = await axios.post<LoginResponse>(`${LLM_SEARCH_URL}/login`, {
        email: USER_EMAIL,
        password: USER_PASSWORD,
    });
    if (response.data.error || !response.data.token) {
        throw new Error(`Login failed: ${response.data.error || 'No token received'}`);
    }
    jwtToken = response.data.token;
    console.log('Login successful.');
    return jwtToken;
}

async function authFetch<T>(endpoint: string, options: AxiosRequestConfig = {}): Promise<T> {
    const token = await login();
    const url = `${LLM_SEARCH_URL}/${endpoint}`;
    const headers = {
        ...options.headers,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
    };
    try {
        const response = await axios({ url, ...options, headers });
        return response.data;
    } catch (error: any) {
        console.error(`API call to ${endpoint} failed:`, error.response?.data || error.message);
        throw error; // Re-throw to be caught by caller
    }
}

async function getApplicationSummary(query: string): Promise<string> {
    console.log(`[Application] Getting summary for query: "${query}"`);

    // 1. Search
    console.log(`[Application] Searching...`);
    const searchResponse = await authFetch<{ searchResult: SearchResult }>(`search?q=${encodeURIComponent(query)}`, { method: 'GET' });
    const webPages = searchResponse.searchResult.webPages?.value || [];
    console.log(`[Application] Found ${webPages.length} initial results.`);

    if (webPages.length === 0) {
        console.warn(`[Application] No search results found for query: "${query}"`);
        return "Could not generate summary as no search results were found.";
    }

    // 2. Partial Summaries
    const urlsToProcess = webPages.slice(0, TOP_N_RESULTS);
    console.log(`[Application] Processing top ${urlsToProcess.length} URLs for partial summaries...`);
    const partialSummaryPromises = urlsToProcess.map(page =>
        authFetch<PartialSummaryResponse>(`process-url`, {
            method: 'POST',
            data: { url: page.url, query: query },
        }).catch(e => {
            console.error(`[Application] Error processing URL ${page.url}:`, e.message);
            return { partialSummary: null, error: `Failed to process URL: ${e.message}` }; // Return error object on failure
        })
    );
    const partialSummaryResults = await Promise.all(partialSummaryPromises);
    const validPartialSummaries = partialSummaryResults.map(r => r.partialSummary).filter((s): s is string => s !== null);
    console.log(`[Application] Got ${validPartialSummaries.length} valid partial summaries.`);

    if (validPartialSummaries.length === 0) {
        console.warn(`[Application] No valid partial summaries could be generated for query: "${query}"`);
        return "Could not generate summary as no website content could be processed.";
    }

    // 3. General Summary
    console.log(`[Application] Generating general summary...`);
    const generalSummaryResponse = await authFetch<GeneralSummaryResponse>(`generate-general-summary`, {
        method: 'POST',
        data: { query: query, partialSummaries: validPartialSummaries },
    });

    if (generalSummaryResponse.error || !generalSummaryResponse.generalSummary) {
         throw new Error(`[Application] Failed to generate general summary: ${generalSummaryResponse.error || 'No summary content received'}`);
    }

    console.log(`[Application] General summary generated.`);
    return generalSummaryResponse.generalSummary;
}
/* ---  Fetch LLMSearch general summary ends --- */

async function getBaselineLLMSummary(query: string, model: OpenRouterModel): Promise<string> {
    console.log(`[Baseline ${model}] Getting summary for query: "${query}"`);
    if (!OPEN_ROUTER_API_KEY) {
        throw new Error('Missing OPENROUTER_API_KEY environment variable.');
    }
    const completor = new OpenRouterCompletor(model);
    const prompt: ChatCompletionMessageParam[] = [
        { role: 'system', content: loadedPrompts.baselineSystem }, // Use loaded prompt
        { role: 'user', content: `User Query: ${query}` }
    ];
    const tryCount = 100;
    for (let i = 0; i < tryCount; ++i) {
        try {
            const summary = await completor.complete(prompt);
            console.log(`[Baseline ${model}] Summary generated for query "${query}": ${summary}`);
            console.log(`[Baseline ${model}] Summary: ${summary}`)
            return summary;
        } catch (error: any) {
            console.error(`[Baseline ${model}] Error generating summary in ${i}-th try:`, error.message);
            await sleep(1000);
        }
    }
    return '';
}

/* ---  Judging --- */
type JudgingDimension = 'relevance' | 'conciseness' | 'completeness';

async function judgeSummary(query: string, summary: string, dimension: JudgingDimension): Promise<ScoreDetail> {
     console.log(`[Judge ${JUDGE_MODEL}] Judging ${dimension} for query: "${query}"`);
    if (!OPEN_ROUTER_API_KEY) {
        throw new Error('Missing OPENROUTER_API_KEY environment variable.');
    }
    if (!summary) {
        return { score: null, explanation: null, error: "Summary was null or empty." };
    }

    // Constructor reads API key from process.env
    const completor = new OpenRouterCompletor([JUDGE_MODEL]);
    // Select the correct loaded prompt template based on dimension
    let promptTemplate: string;
    switch (dimension) {
        case 'relevance': promptTemplate = loadedPrompts.judgeRelevance; break;
        case 'conciseness': promptTemplate = loadedPrompts.judgeConciseness; break;
        case 'completeness': promptTemplate = loadedPrompts.judgeCompleteness; break;
    }
    const promptContent = promptTemplate
        .replace('{query}', query)
        .replace('{summary}', summary);

    const prompt: ChatCompletionMessageParam[] = [
        { role: 'system', content: promptContent }
    ];

    let response: string = '';
    let lastError: any;
    const tryCount = 100;
    for (let i = 0; i < tryCount; ++i) {
        try {
            response = await completor.complete(prompt);
            console.log(`[Judge ${JUDGE_MODEL}] Raw ${dimension} judgement: ${response}`);
            // Attempt to parse the JSON response
            const parsed = JSON.parse(response);
            // Add a check to ensure parsed is a valid object before accessing properties
            if (parsed === null || typeof parsed !== 'object' || typeof parsed.score !== 'number' || typeof parsed.explanation !== 'string') {
                throw new Error('Invalid JSON structure or missing properties in judge response.');
            }
            console.log(`[Judge ${JUDGE_MODEL}] Parsed ${dimension} score: ${parsed.score}`);
            return { score: parsed.score, explanation: parsed.explanation };
        } catch (error: any) {
            lastError = error;
            console.error(`[Judge ${JUDGE_MODEL}] ${i}-th try failed. Sleep 1s then try again.`);
            await sleep(1000);
        }
    }
    console.error(`[Judge ${JUDGE_MODEL}] Error judging ${dimension} for query "${query}":`, lastError?.message);
    return { score: null, explanation: null, error: `Failed to judge: ${lastError?.message}` };
}
/* ---  Judging ends --- */

async function main() {
    console.log("Starting evaluation process...");

    // Check env vars are here
    if (!USER_EMAIL || !USER_PASSWORD || !LLM_SEARCH_URL || !OPEN_ROUTER_API_KEY) {
        console.error("Error: Missing required environment variables (USER_EMAIL, USER_PASSWORD, LLM_SEARCH_URL, OPENROUTER_API_KEY).");
        process.exit(1);
    }

    // Ensure results directory exists
    try {
        await fs.mkdir(OUTPUT_DIR, { recursive: true });
        console.log(`Ensured output directory exists: ${OUTPUT_DIR}`);
    } catch (e) {
        console.error(`Failed to create output directory: ${OUTPUT_DIR}`, e);
        process.exit(1);
    }

    const allEvaluationResults: QueryEvaluationResult[] = [];

    // for each prompt
    for (const evaluationPrompt of searchPromptSet) {
        const query = evaluationPrompt.searchPrompt;
        const promptType = evaluationPrompt.type;
        console.log(`\n--- Evaluating Prompt Type: ${promptType}, Query: "${query}" ---`);

        const queryResults: ModelEvaluationResult[] = [];

        // Evaluate LLMSearch
        if (EVALUATE_LLM_SEARCH) {
            let appSummary: string | null = null;
            let appError: string | undefined;
            try {
                appSummary = await getApplicationSummary(query);
            } catch (e: any) {
                console.error(`[Application] Failed to get summary for query "${query}":`, e.message);
                appError = e.message;
            }
            queryResults.push({
                model: 'llm-search',
                summary: appSummary,
                error: appError,
                scores: {
                    relevance: { score: null, explanation: null },
                    conciseness: { score: null, explanation: null },
                    completeness: { score: null, explanation: null },
                }
            });
        }

        // Evaluate Baseline Models
        const baselineSummaries = BASELINE_MODELS.map(modelName => getBaselineLLMSummary(query, modelName)); // for parallel fetching of summaries
        for (const i in BASELINE_MODELS) {
            const modelName = BASELINE_MODELS[i];
            let baselineSummary: string | null = null;
            let baselineError: string | undefined;
            try {
                baselineSummary = await baselineSummaries[i];
            } catch (e: any) {
                console.error(`[Baseline ${modelName}] Failed to get summary for query "${query}":`, e.message);
                baselineError = e.message;
            }
            queryResults.push({
                model: modelName,
                summary: baselineSummary,
                error: baselineError,
                scores: {
                    relevance: { score: null, explanation: null },
                    conciseness: { score: null, explanation: null },
                    completeness: { score: null, explanation: null },
                }
            });
        }

        // Judge all generated summaries
        console.log(`--- Judging summaries for query: "${query}" ---`);
        for (const result of queryResults) {
            if (result.summary && !result.error) { // Only judge if summary was generated successfully
                 // for parallel fetching of summaries
                const judgeResults = await Promise.all([
                    judgeSummary(query, result.summary, 'relevance'), 
                    judgeSummary(query, result.summary, 'conciseness'), 
                    judgeSummary(query, result.summary, 'completeness')
                ]);
                result.scores.relevance = judgeResults[0];
                result.scores.conciseness = judgeResults[1];
                result.scores.completeness = judgeResults[2];
            } else {
                 console.log(`Skipping judgement for ${result.model} due to generation error or empty summary.`);
                 const errorMsg = result.error || "Summary was null or empty.";
                 result.scores.relevance = { score: null, explanation: null, error: errorMsg };
                 result.scores.conciseness = { score: null, explanation: null, error: errorMsg };
                 result.scores.completeness = { score: null, explanation: null, error: errorMsg };
            }
        }
        allEvaluationResults.push({ query, promptType, results: queryResults });
    }

    // Save results to file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputFilename = `evaluation_results_${timestamp}.json`;
    const outputPath = path.join(OUTPUT_DIR, outputFilename);

    try {
        await fs.writeFile(outputPath, JSON.stringify(allEvaluationResults, null, 2));
        console.log(`\nEvaluation complete. Results saved to: ${outputPath}`);
    } catch (e) {
        console.error(`Failed to write results to file: ${outputPath}`, e);
    }
}

main().catch(error => {
    console.error("\n--- Unhandled Error in Main Execution ---");
    console.error(error);
    process.exit(1);
});
