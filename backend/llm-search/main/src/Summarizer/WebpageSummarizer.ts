import LLMPromptCompletor from "../LLMPromptCompleter/LLMPromptCompletor"

export default class WebpageSummarizer {
    constructor(private llm: LLMPromptCompletor) {
    }
    public summarize = (query: string, partialSummary: string): Promise<string> => {
        return this.llm.complete([
            {
                role: 'system',
                content:
                `
                Summarize the content of a webpage from the summary of the webpage. Output 4 sentences relevant to the user query.
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

                The partial summary: 
                <partial summary starts>
                ${partialSummary}
                <partial summary ends>

                Your summary:
                `
            }
        ]);
    }
}