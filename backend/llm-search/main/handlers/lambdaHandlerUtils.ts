import { APIGatewayProxyResult } from 'aws-lambda';

// Helper function for CORS headers and error responses
export const createResponse = (statusCode: number, body: any, headers?: { [key: string]: string }): APIGatewayProxyResult => ({
    statusCode,
    body: JSON.stringify(body),
    headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': 'https://llm-search.pages.dev', // Adjust for production
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        ...headers,
    },
});

export const handleError = (error: unknown, messagePrefix: string): APIGatewayProxyResult => {
    console.error(`${messagePrefix}. Error: ${error}`);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return createResponse(500, { error: `${messagePrefix}. Error: ${errorMessage}` });
};