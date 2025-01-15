import LLMPromptCompleter from "./LLMPromptCompleter/LLMPromptCompleter"
import * as cheerio from "cheerio";

export default class SnippetSummarizer {
    constructor(private llm: LLMPromptCompleter) {
    }
    /**
     * Extract body text content from HTML string, removing tags, images, links, scripts and extra whitespaces.
     * @param htmlContent HTML string.
     */
    private htmlToBodyText = (htmlContent: string): string => {
        const $ = cheerio.load(htmlContent);
        $('script, style, a, img').remove();
        return $('body').text().replace(/\s+/g, ' ');
    }
    public summarize = (query: string, htmlContent: string): Promise<string> => {
        const text = this.htmlToBodyText(htmlContent);
        console.log(`got text: ${text}`);
        console.log(`text length: ${text.length}`);
        return this.llm.complete([
            {
                role: 'system',
                content:
                `
                Extract all information relevant to the user query from the provided webpage body text content. Output it in paragraphs.
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

                The webpage body text: 
                <website body text starts>
                ${text}
                <website body text ends>
                `
            }
        ]);
        // return this.llm.complete([
        //     {
        //         role: 'system',
        //         content:
        //         `
        //         Answer the user query by summarizing the webpage body text content in 2 sentences in readable language. 
        //         Output the summary in the format 'Summary: ...'.
        //         The user query: "${query}"
        //         `
        //     },
        //     {
        //         role: 'user', 
        //         content: `The webpage body text: "${text}"`
        //     }
        // ]);
    }
}