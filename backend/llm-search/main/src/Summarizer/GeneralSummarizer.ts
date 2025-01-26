import LLMPromptCompletor from "../LLMPromptCompleter/LLMPromptCompletor"

export default class GeneralSummarizer {
    constructor(private llm: LLMPromptCompletor) {
    }
    public summarize = (query: string, partialSummaries: string[]): Promise<string> => {
        const summariesQuery = partialSummaries.map((summary, index) => {
            return `<Webpage ${index}'s partial summary starts>${summary}<Webpage ${index}'s partial summary ends>`;
        }).join('\n');
        return this.llm.complete([
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
                role: 'user', 
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
        ]);
    }
}