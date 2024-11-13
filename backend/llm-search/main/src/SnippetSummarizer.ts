export default class SnippetSummarizer {
    constructor(private llm: LLM) {
    }
    public summarize = (snippet: string) => {
        return this.llm.complete(`
            Summarize the following web search result snippet in 2 sentences in readable language. 
            Output the summary in the format 'Summary: ...'.
            The snippet: "${snippet}"
        `)
    }
}