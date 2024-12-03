export default class SnippetSummarizer {
    constructor(private llm: LLM) {
    }
    public summarize = (query: string, snippet: string) => {
        return this.llm.complete(`
            Answer the user query by summarizing the web search result snippet in 2 sentences in readable language. 
            Output the summary in the format 'Summary: ...'.
            The user query: "${query}"
            The snippet: "${snippet}"
        `)
    }
}