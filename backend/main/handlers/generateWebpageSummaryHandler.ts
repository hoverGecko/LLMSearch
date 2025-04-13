import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import WebpageSummarizer from '../src/Summarizer/WebpageSummarizer';
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

    let query: string | undefined;
    let partialSummary: string | undefined;
    try {
        const body = JSON.parse(event.body);
        query = body.query;
        partialSummary = body.partialSummary;
        if (!query || typeof partialSummary !== 'string' || partialSummary.trim() === '') {
            throw new Error('Missing "query" or valid "partialSummary" (must be a non-empty string) in request body.');
        }
    } catch (e) {
        return handleError(e, 'Invalid request body');
    }

    const completor = new OpenRouterCompletor('google/gemini-2.0-flash-001');
    const webpageSummarizer = new WebpageSummarizer(completor);

    try {
        console.log(`Generating webpage summary for query: "${query}"`);

        const webpageSummary = await webpageSummarizer.summarize(query, partialSummary);

        console.log('Webpage summary generated.');

        return createJsonResponse(200, {
            webpageSummary: webpageSummary,
        });

    } catch (e) {
        return handleError(e, 'Error generating webpage summary');
    }
};
