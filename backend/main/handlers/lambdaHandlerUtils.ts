import { APIGatewayProxyResult } from 'aws-lambda';

const allowedOrigin = process.env.APP_ENVIRONMENT === 'dev' ? '*' : 'https://llm-search.pages.dev';

export const createJsonResponse = (statusCode: number, body: any, headers?: { [key: string]: string }): APIGatewayProxyResult => ({
    statusCode,
    body: JSON.stringify(body),
    headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': allowedOrigin,
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        ...headers,
    },
});

export const handleError = (error: unknown, messagePrefix: string): APIGatewayProxyResult => {
    console.error(`${messagePrefix}. Error: ${error}`);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return createJsonResponse(500, { error: `${messagePrefix}. Error: ${errorMessage}` });
};
