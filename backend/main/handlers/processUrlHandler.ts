import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import PartialSummarizer from '../src/Summarizer/PartialSummarizer';
import WebScraper from '../src/WebScraper';
import OpenRouterCompletor from '../src/LLMPromptCompleter/OpenRouterCompletor';
import { createJsonResponse, handleError } from './lambdaHandlerUtils';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    if (event.httpMethod === 'OPTIONS') {
        return createJsonResponse(200, {});
    }
    if (event.httpMethod !== 'POST') {
         return createJsonResponse(405, { error: `Unsupported method: ${event.httpMethod}` });
    }
    if (!event.body) {
        return createJsonResponse(400, { error: 'Missing request body.' });
    }

    let url: string | undefined;
    let query: string | undefined;
    try {
        const body = JSON.parse(event.body);
        url = body.url;
        query = body.query;
        if (!url || !query) {
            throw new Error('Missing "url" or "query" in request body.');
        }
    } catch (e) {
        return handleError(e, 'Invalid request body');
    }

    const completor = new OpenRouterCompletor('google/gemini-2.0-flash-001');
    const partialSummarizer = new PartialSummarizer(completor);
    const scraper = new WebScraper();

    try {
        console.log(`Processing URL: <${url}> for query: "${query}"`);
        const htmlContent = await scraper.urlToPlainText(url);

        if (!htmlContent) {
            console.warn(`Failed to scrape content from ${url}`);
            return createJsonResponse(200, { partialSummary: null, error: 'Failed to load webpage content.' });
        }

        const partialSummary = await partialSummarizer.summarize(query, htmlContent);
        console.log(`Partial summary generated for ${url}`);

        return createJsonResponse(200, { partialSummary });

    } catch (e) {
        return handleError(e, `Error processing URL: ${url}`);
    }
};
