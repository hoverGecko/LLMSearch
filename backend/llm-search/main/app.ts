import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import AzureGPTCompleter from './src/LLMPromptCompleter/AzureGPTCompleter';
import BingSearchService from './src/BingSearch/BingSearchService';
import SnippetSummarizer from './src/HtmlSummarizer';
import HyperbolicCompleter from './src/LLMPromptCompleter/HyperbolicCompletor';
import WebScraper from './src/WebScraper';

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
    const scraper = new WebScraper();

    try {
        const searchResult = await searchService.search(query);
        console.log('after search')
        if (searchResult._type == 'ErrorResponse') {
            return {
                statusCode: 500,
                body: JSON.stringify({ error: 'Bing returns ErrorResponse.', bingErrorResponse: searchResult })
            };
        }
        // Use summarizer to summarize the first results' contents
        for (let i = 0; i < 1; ++i) {
            const webpage = searchResult.webPages?.value[i];
            if (webpage?.url) {
                console.log(`${i}-th URL: <${webpage.url}>`)
                const htmlContent = await scraper.urlToHtml(webpage.url);
                if (htmlContent) {
                    console.log(`summarizing html`)
                    console.log(`html length: ${htmlContent.length}`)
                    const summary = await summarizer.summarize(query, htmlContent);
                    webpage.snippet = summary;
                }
            };
        }
        return {
            statusCode: 200,
            body: JSON.stringify(searchResult)
        };
    } catch (e)  {
        console.error(`500 error when fetching search API results. Error: ${e}`);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: `HTTP error when fetching search API results. Error: ${e}` })
        };
    }
};