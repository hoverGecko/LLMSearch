import * as fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface ScoreDetail {
    score: number | null;
    explanation: string | null;
    error?: string;
}

interface ModelEvaluationResult {
    model: string;
    summary: string | null;
    error?: string;
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

async function convertJsonFilesToCsv(jsonFilePaths: string[]): Promise<void> {
    let allEvaluationResults: QueryEvaluationResult[] = [];

    try {
        // Read and aggregate data from all JSON files
        for (const jsonFilePath of jsonFilePaths) {
            console.log(`Reading JSON file: ${jsonFilePath}`);
            const jsonData = await fs.readFile(jsonFilePath, 'utf-8');
            const evaluationResults: QueryEvaluationResult[] = JSON.parse(jsonData);
            allEvaluationResults = allEvaluationResults.concat(evaluationResults);
            console.log(`Read ${evaluationResults.length} results from ${path.basename(jsonFilePath)}. Total results: ${allEvaluationResults.length}`);
        }

        if (allEvaluationResults.length === 0) {
            console.log("No evaluation results found in the provided files.");
            return;
        }

        // Define CSV header
        const csvRows: string[] = ['"query","promptType","model","generatedSummary","relevance_score","relevance_explanation","conciseness_score","conciseness_explanation","completeness_score","completeness_explanation"'];

        // Process each evaluation result
        for (const queryResult of allEvaluationResults) {
            const query = `"${queryResult.query.replace(/"/g, '""')}"`; // Escape double quotes
            const promptType = `"${queryResult.promptType.replace(/"/g, '""')}"`; // Escape double quotes

            for (const modelResult of queryResult.results) {
                const modelName = `"${modelResult.model.replace(/"/g, '""')}"`; // Escape double quotes
                // Ensure null is handled and quotes are escaped
                const generatedSummary = `"${(modelResult.summary || '').replace(/"/g, '""')}"`;
                const relevanceScore = modelResult.scores.relevance.score !== null ? modelResult.scores.relevance.score : 'null';
                const relevanceExplanation = `"${(modelResult.scores.relevance.explanation || '').replace(/"/g, '""')}"`;
                const concisenessScore = modelResult.scores.conciseness.score !== null ? modelResult.scores.conciseness.score : 'null';
                const concisenessExplanation = `"${(modelResult.scores.conciseness.explanation || '').replace(/"/g, '""')}"`;
                const completenessScore = modelResult.scores.completeness.score !== null ? modelResult.scores.completeness.score : 'null';
                const completenessExplanation = `"${(modelResult.scores.completeness.explanation || '').replace(/"/g, '""')}"`;

                // Added generatedSummary to the row
                csvRows.push(`${query},${promptType},${modelName},${generatedSummary},${relevanceScore},${relevanceExplanation},${concisenessScore},${concisenessExplanation},${completenessScore},${completenessExplanation}`);
            }
        }

        // Determine output file path
        const outputDirPath = path.join(__dirname, 'results');
        let outputFileName: string;
        if (jsonFilePaths.length > 1) {
            outputFileName = 'combined_evaluation_results.csv'; // Fixed name for multiple files
        } else {
            // Keep original naming if only one file is processed
            const jsonFileName = path.basename(jsonFilePaths[0], path.extname(jsonFilePaths[0]));
            outputFileName = `${jsonFileName}.csv`;
        }
        const outputFilePath = path.join(outputDirPath, outputFileName);

        // Ensure output directory exists
        await fs.mkdir(outputDirPath, { recursive: true });

        // Write the CSV file
        console.log(`Writing CSV file: ${outputFilePath}`);
        await fs.writeFile(outputFilePath, csvRows.join('\n'), 'utf-8');
        console.log('CSV conversion complete.');

    } catch (error: any) {
        console.error(`Error converting JSON to CSV: ${error.message}`);
        console.error(error);
    }
}

// Get the JSON file paths from command line arguments
const args = process.argv.slice(2);
if (args.length === 0) {
    console.error("Usage: ts-node convertToJson.ts <path_to_json_file1> [path_to_json_file2] ...");
    process.exit(1);
}

// Resolve all input paths relative to the script directory
const jsonInputPaths = args.map(arg => path.resolve(__dirname, arg));

convertJsonFilesToCsv(jsonInputPaths);
