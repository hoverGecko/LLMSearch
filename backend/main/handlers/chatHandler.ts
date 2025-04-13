import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import OpenRouterCompletor from '../src/LLMPromptCompleter/OpenRouterCompletor';
import { createJsonResponse, handleError } from './lambdaHandlerUtils';
import { ChatCompletionMessageParam } from 'openai/resources';

// --- Handler for continuing the chat ---
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
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

    let history: ChatCompletionMessageParam[] | undefined;
    let query: string | undefined;
    try {
        const body = JSON.parse(event.body);
        history = body.history;
        query = body.query;
        // Check if history is an array and query is a string
        if (!Array.isArray(history) || typeof query !== 'string') {
            throw new Error('Invalid request body: "history" must be an array and "query" must be a string.');
        }
        // Check if history items match ChatCompletionMessageParam structure
        if (history.some(msg => typeof msg !== 'object' || !msg.role || !msg.content)) {
             throw new Error('Invalid request body: "history" items must have "role" and "content".');
        }

    } catch (e) {
        return handleError(e, 'Invalid request body');
    }

    // Instantiate the LLM completor
    const completor = new OpenRouterCompletor('google/gemini-2.0-flash-001');

    try {
        console.log(`Continuing chat with query: "${query}"`);

        // Append the user's new query to the history
        const currentHistory = [...history, { role: 'user', content: query }] as ChatCompletionMessageParam[];

        // Get the LLM's response
        const llmResponse = await completor.complete(currentHistory);
        console.log('LLM response received.');

        // Append the assistant's response to the history
        const updatedHistory = [...currentHistory, { role: 'assistant', content: llmResponse }] as ChatCompletionMessageParam[];

        // Return the complete updated history
        return createJsonResponse(200, {
            history: updatedHistory,
        });

    } catch (e) {
        return handleError(e, 'Error processing chat request');
    }
};
