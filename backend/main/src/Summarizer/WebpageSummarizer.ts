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
Extract all information relevant to the user query from the provided webpage body text content. 
Output at most 5 sentences relevant to the user query.
Do not include introductory phrases or explanations; start directly with the relevant information. 
If the webpage does not load, simply say 'Fail to load the webpage content.' without additional sentences.
Do not use markdown. Return plaintext only.
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