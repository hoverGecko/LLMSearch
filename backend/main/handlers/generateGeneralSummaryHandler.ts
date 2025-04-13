import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import GeneralSummarizer from '../src/Summarizer/GeneralSummarizer';
import OpenRouterCompletor from '../src/LLMPromptCompleter/OpenRouterCompletor';
import { createJsonResponse, handleError } from './lambdaHandlerUtils';
import { ChatCompletionMessageParam } from 'openai/resources';

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
    let partialSummaries: (string | null)[] | undefined;
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

    const validPartialSummaries = partialSummaries.filter((s): s is string => s !== null);

    if (validPartialSummaries.length === 0) {
        console.warn("No valid partial summaries provided to generate general summary.");
         return createJsonResponse(200, { generalSummary: "Could not generate summary as no website content could be processed." });
    }

    const completor = new OpenRouterCompletor('google/gemini-2.0-flash-001');
    const generalSummarizer = new GeneralSummarizer(completor);

    try {
        console.log(`Generating general summary for query: "${query}"`);

        const { prompt, summary } = await generalSummarizer.summarize(query, validPartialSummaries);
        console.log('General summary generated.');

        const initialChatHistory: ChatCompletionMessageParam[] = [
            ...prompt,
            { role: 'assistant', content: summary }
        ];

        return createJsonResponse(200, {
            generalSummary: summary,
            initialChatHistory: initialChatHistory,
        });

    } catch (e) {
        return handleError(e, 'Error generating general summary');
    }
};
