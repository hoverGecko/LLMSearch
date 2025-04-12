import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import WebpageSummarizer from '../src/Summarizer/WebpageSummarizer'; // Use WebpageSummarizer
import OpenRouterCompletor from '../src/LLMPromptCompleter/OpenRouterCompletor';
import { createResponse, handleError } from './lambdaHandlerUtils';

// --- Handler for generating a single WEBPAGE summary ---
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

    let query: string | undefined;
    let partialSummary: string | undefined; // Expect a single string
    try {
        const body = JSON.parse(event.body);
        query = body.query;
        partialSummary = body.partialSummary; // Changed from partialSummaries array
        // Validate that partialSummary is a non-empty string
        if (!query || typeof partialSummary !== 'string' || partialSummary.trim() === '') {
            throw new Error('Missing "query" or valid "partialSummary" (must be a non-empty string) in request body.');
        }
    } catch (e) {
        return handleError(e, 'Invalid request body');
    }

    // Instantiate necessary services
    // TODO: Select completor based on env/config or request parameter
    const completor = new OpenRouterCompletor('google/gemini-2.0-flash-001');
    const webpageSummarizer = new WebpageSummarizer(completor); // Use WebpageSummarizer

    try {
        console.log(`Generating webpage summary for query: "${query}"`);

        // Generate webpage summary from the single partial summary
        const webpageSummary = await webpageSummarizer.summarize(query, partialSummary);

        console.log('Webpage summary generated.');

        return createResponse(200, {
            webpageSummary: webpageSummary, // Return only the webpage summary
        });

    } catch (e) {
        return handleError(e, 'Error generating webpage summary');
    }
};
