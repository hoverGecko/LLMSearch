import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import BingSearchService from '../src/BingSearch/BingSearchService';
import { createResponse, handleError } from './lambdaHandlerUtils';

// --- Handler for initial search ---
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    // Handle OPTIONS request for CORS preflight
    if (event.httpMethod === 'OPTIONS') {
        return createResponse(200, {});
    }

    const query = event.queryStringParameters?.['q'];
    if (!query) {
        return createResponse(400, { error: 'Missing search query string "q" e.g. "/search?q=apple".' });
    }

    const { BING_API_KEY } = process.env;
    if (!BING_API_KEY) {
        console.error('Server configuration error: Missing BING_API_KEY.');
        return createResponse(500, { error: 'Server configuration error.' });
    }
    const searchService = new BingSearchService(BING_API_KEY);

    try {
        const searchResult = await searchService.search(query);
        console.log('Bing search completed.');

        if (searchResult._type === 'ErrorResponse') {
            console.error('Bing API returned an error:', searchResult);
            return createResponse(500, { error: 'Bing search failed.', details: searchResult });
        }

        // Only return the search results, frontend will handle the rest
        return createResponse(200, { searchResult });

    } catch (e) {
        return handleError(e, 'Error during Bing search');
    }
};