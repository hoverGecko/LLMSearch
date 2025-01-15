import LLMPromptCompleter from "../LLMPromptCompleter/LLMPromptCompleter"
import * as cheerio from "cheerio";

export default class PartialSummarizer {
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
        console.log(`got text of length ${text.length}: ${text.slice(0, 20)}...`);
        return this.llm.complete([
            {
                role: 'system',
                content:
                `
                Extract all information relevant to the user query from the provided webpage body text content. Output it in paragraphs.
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