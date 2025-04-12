import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import PartialSummarizer from '../src/Summarizer/PartialSummarizer';
import WebScraper from '../src/WebScraper';
import OpenRouterCompletor from '../src/LLMPromptCompleter/OpenRouterCompletor';
import { createResponse, handleError } from './lambdaHandlerUtils';

// --- Handler for processing a single URL ---
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    // Handle OPTIONS request for CORS preflight
    if (event.httpMethod === 'OPTIONS') {
        return createResponse(200, {});
    }
    if (event.httpMethod !== 'POST') {
         return createResponse(405, { error: `Unsupported method: ${event.httpMethod}` });
    }

    if (!event.body) {
        return createResponse(400, { error: 'Missing request body.' });
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

    // Instantiate necessary services (Consider optimization/sharing if needed)
    // TODO: Select completor based on env/config or request parameter
    const completor = new OpenRouterCompletor('google/gemini-2.0-flash-lite-001');
    const partialSummarizer = new PartialSummarizer(completor);
    const scraper = new WebScraper();

    try {
        console.log(`Processing URL: <${url}> for query: "${query}"`);
        const htmlContent = await scraper.urlToPlainText(url);

        if (!htmlContent) {
            console.warn(`Failed to scrape content from ${url}`);
            // Return a specific indicator for failed scraping
            return createResponse(200, { partialSummary: null, error: 'Failed to load webpage content.' });
        }

        const partialSummary = await partialSummarizer.summarize(query, htmlContent);
        console.log(`Partial summary generated for ${url}`);

        return createResponse(200, { partialSummary });

    } catch (e) {
        return handleError(e, `Error processing URL: ${url}`);
    }
};