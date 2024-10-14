import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

/**
 *
 * Event doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html#api-gateway-simple-proxy-for-lambda-input-format
 * @param {Object} event - API Gateway Lambda Proxy Input Format
 *
 * Return doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html
 * @returns {Object} object - API Gateway Lambda Proxy Output Format
 *
 */

export const lambdaHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const query = event.queryStringParameters?.['q'];

    if (query == null) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Missing search query string "q" e.g. "/search?q=apple".' })
        };
    };

    const apiKey = process.env.BING_API_KEY;
    const url = `https://api.bing.microsoft.com/v7.0/search?q=${encodeURIComponent(query)}`;

    if (apiKey == null) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Failed to get Bing API Key.' })
        };
    };

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Ocp-Apim-Subscription-Key': apiKey,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return {
            statusCode: 200,
            body: JSON.stringify(data)
        };
    } catch (error) {
        console.error('Error fetching data:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Failed to fetch search results' })
        };
    }
};
