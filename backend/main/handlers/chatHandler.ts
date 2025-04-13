import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
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

    let history: ChatCompletionMessageParam[] | undefined;
    let query: string | undefined;
    try {
        const body = JSON.parse(event.body);
        history = body.history;
        query = body.query;
        if (!Array.isArray(history) || typeof query !== 'string') {
            throw new Error('Invalid request body: "history" must be an array and "query" must be a string.');
        }
        if (history.some(msg => typeof msg !== 'object' || !msg.role || !msg.content)) {
             throw new Error('Invalid request body: "history" items must have "role" and "content".');
        }

    } catch (e) {
        return handleError(e, 'Invalid request body');
    }

    const completor = new OpenRouterCompletor('google/gemini-2.0-flash-001');

    try {
        console.log(`Continuing chat with query: "${query}"`);

        const systemPrompt = `
System: You are a helpful assistant discussing a topic based on previously summarized web search results. 
Use the provided chat history to answer the user's latest query. 
If the information in the history seems insufficient to provide a comprehensive answer, explicitly state that and suggest 3-5 distinct search terms the user could explore further. 
Format the suggestions clearly below your main response, starting with the exact phrase "Suggested searches:" on a new line, followed by bullet points (using '-') for each suggestion. 
If suggestions are not needed, do not include the "Suggested searches:" phrase or any suggestions.
`;

        const messagesForLLM: ChatCompletionMessageParam[] = [
            { role: 'system', content: systemPrompt },
            ...history, // Spread the existing history
            { role: 'user', content: query } // Add the latest user query
        ];

        const llmRawResponse = await completor.complete(messagesForLLM);
        console.log('LLM raw response received.');

        let assistantAnswer = llmRawResponse;
        let suggestedQueries: string[] = [];

        // get suggested searches texts
        const suggestionMarker = "\nSuggested searches:";
        const suggestionIndex = llmRawResponse.indexOf(suggestionMarker);
        if (suggestionIndex !== -1) {
            assistantAnswer = llmRawResponse.substring(0, suggestionIndex).trim();
            const suggestionsBlock = llmRawResponse.substring(suggestionIndex + suggestionMarker.length).trim();
            suggestedQueries = suggestionsBlock.split('\n')
                .map(line => line.trim())
                .filter(line => line.startsWith('-'))
                .map(line => line.substring(1).trim())
                .filter(query => query.length > 0);
            console.log('Extracted suggested queries:', suggestedQueries);
        } else {
             console.log('No suggested queries found in LLM response.');
        }

        const updatedHistory = [
            ...history,
            { role: 'user', content: query },
            { role: 'assistant', content: assistantAnswer }
        ] as ChatCompletionMessageParam[];
        return createJsonResponse(200, {
            history: updatedHistory,
            suggested_queries: suggestedQueries
        });

    } catch (e) {
        return handleError(e, 'Error processing chat request');
    }
};
