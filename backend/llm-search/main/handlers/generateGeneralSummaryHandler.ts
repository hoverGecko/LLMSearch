import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import GeneralSummarizer from '../src/Summarizer/GeneralSummarizer';
import OpenRouterCompletor from '../src/LLMPromptCompleter/OpenRouterCompletor';
import { createJsonResponse, handleError } from './lambdaHandlerUtils';

// --- Handler for generating the GENERAL summary ---
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => { // Renamed handler export
    // Handle OPTIONS request for CORS preflight
    if (event.httpMethod === 'OPTIONS') {
        return createJsonResponse(200, {});
    }
    if (event.httpMethod !== 'POST') {
         return createJsonResponse(405, { error: `Unsupported method: ${event.httpMethod}` });
    }

    if (!event.body) {
        return createJsonResponse(400, { error: 'Missing request body.' });
    }

    let query: string | undefined;
    let partialSummaries: (string | null)[] | undefined; // Allow nulls for failed ones
    try {
        const body = JSON.parse(event.body);
        query = body.query;
        partialSummaries = body.partialSummaries;
        if (!query || !Array.isArray(partialSummaries)) {
            throw new Error('Missing "query" or "partialSummaries" (must be an array) in request body.');
        }
    } catch (e) {
        return handleError(e, 'Invalid request body');
    }

    // Filter out null summaries before passing to summarizers that expect strings
    const validPartialSummaries = partialSummaries.filter((s): s is string => s !== null);

    if (validPartialSummaries.length === 0) {
        console.warn("No valid partial summaries provided to generate general summary.");
        // Return empty summary or an appropriate message
         return createJsonResponse(200, { generalSummary: "Could not generate summary as no website content could be processed." });
    }

    // Instantiate necessary services
    // TODO: Select completor based on env/config or request parameter
    const completor = new OpenRouterCompletor('google/gemini-2.0-flash-001');
    const generalSummarizer = new GeneralSummarizer(completor);

    try {
        console.log(`Generating general summary for query: "${query}"`);

        // Generate general summary from valid partial summaries
        const generalSummary = await generalSummarizer.summarize(query, validPartialSummaries);


        console.log('General summary generated.');

        return createJsonResponse(200, {
            generalSummary: generalSummary,
        });

    } catch (e) {
        return handleError(e, 'Error generating general summary'); // Updated error message
    }
};
