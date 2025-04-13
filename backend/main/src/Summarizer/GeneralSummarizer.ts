import LLMPromptCompletor from "../LLMPromptCompleter/LLMPromptCompletor";
import { ChatCompletionMessageParam } from 'openai/resources';

interface SummarizeResult {
    prompt: ChatCompletionMessageParam[];
    summary: string;
}

export default class GeneralSummarizer {
    constructor(private llm: LLMPromptCompletor) {
    }
    public summarize = async (query: string, partialSummaries: string[]): Promise<SummarizeResult> => {
        const summariesQuery = partialSummaries.map((summary, index) => {
            return `<Webpage ${index}'s partial summary starts>${summary}<Webpage ${index}'s partial summary ends>`;
        }).join('\n');

        const prompt: ChatCompletionMessageParam[] = [
            {
                role: 'system',
                content:
                `
                Extract information relevant to the user query from the summaries of webpages provided. Output it in at most 3 paragraphs.
                Do not include introductory phrases or explanations; start directly with the relevant information.
                If the webpage does not load, simply say 'Fail to load the webpage content.' without additional sentences.
                `
            },
            {
                role: 'system',
                content:
                `
                The user query:
                <user query starts>
                ${query}
                <user query ends>

                The partial summaries:
                ${summariesQuery}

                Your summary:
                `
            }
        ];

        const summary = await this.llm.complete(prompt);
        return { prompt, summary };
    }
}
