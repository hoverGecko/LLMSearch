import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import AzureGPTCompleter from './src/LLMPromptCompleter/AzureGPTCompleter';
import BingSearchService from './src/BingSearchService';
import SnippetSummarizer from './src/SnippetSummarizer';
import HyperbolicCompleter from './src/LLMPromptCompleter/HyperbolicCompletor';

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

    const { BING_API_KEY } = process.env;
    const searchService = new BingSearchService(BING_API_KEY);
    const summarizer = new SnippetSummarizer(new HyperbolicCompleter("meta-llama/Llama-3.2-3B-Instruct"));

    try {
        const searchResult = await searchService.search(query);
        console.log('after search')
        if (searchResult._type == 'ErrorResponse') {
            return {
                statusCode: 500,
                body: JSON.stringify({ error: 'Bing returns ErrorResponse.', bingErrorResponse: searchResult })
            };
        }
        // Use summarizer to summarize the first 1 results' snippets
        for (let i = 0; i < 3; ++i) {
            const webpage = searchResult.webPages?.value[i];
            if (webpage?.snippet) {
                try {
                    const summary = await summarizer.summarize(query, webpage.snippet);
                    webpage.snippet = summary;
                } catch (e) {
                    console.error(e);
                }
            };
        }
        return {
            statusCode: 200,
            body: JSON.stringify(searchResult)
        };
    } catch (e)  {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: `HTTP error when fetching search API results. Error: ${e}` })
        };
    }
};