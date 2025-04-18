import LLMPromptCompletor from "../LLMPromptCompleter/LLMPromptCompletor"

export default class PartialSummarizer {
    constructor(private llm: LLMPromptCompletor) {
    }
    public summarize = (query: string, text: string): Promise<string> => {
        console.log(`got text of length ${text.length}: ${text.slice(0, 20)}...`);
        return this.llm.complete([
            {
                role: 'system',
                content:
                `
Extract all the key information from the provided webpage body text content. Output it in paragraphs.
Do not include introductory phrases or explanations; start directly with the relevant information. 
If the webpage does not load, simply say 'Fail to load the webpage content.' without additional sentences.
Do not use markdown. Return plaintext only.
                `
            },
            {
                role: 'system', 
                content: 
                `
The webpage body text: 
<website body text starts>
${text}
<website body text ends>

Your summary:
                `
            }
        ]);
    }
}