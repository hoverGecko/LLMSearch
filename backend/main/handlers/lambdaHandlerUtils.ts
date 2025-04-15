import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import jwt from 'jsonwebtoken';

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

const JWT_SECRET = process.env.JWT_SECRET!;

/**
 * Verify the API event authorization token.
 * If successfull, return user email.
 * If not, return null.
 * @param event API event.
 */
export const verifyUserEmail = (event: APIGatewayProxyEvent): string | null => {
    const token = event.headers?.Authorization?.split(' ')?.[1] ?? '';
    if (!token) {
        return null;
    }
    try {
        const decoded = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;
        if (typeof decoded === "string") {
            return null;
        }
        return decoded.email || null;
    } catch (e: any) {
        return null;
    }
}