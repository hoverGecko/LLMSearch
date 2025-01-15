import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import BingSearchService from './src/BingSearch/BingSearchService';
import PartialSummarizer from './src/Summarizer/PartialSummarizer';
import HyperbolicCompleter from './src/LLMPromptCompleter/HyperbolicCompletor';
import WebScraper from './src/WebScraper';
import GeneralSummarizer from './src/Summarizer/GeneralSummarizer';
import WebpageSummarizer from './src/Summarizer/WebpageSummarizer';

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
    const completor = new HyperbolicCompleter("meta-llama/Llama-3.2-3B-Instruct");
    const partialSummarizer = new PartialSummarizer(completor);
    const generalSummarizer = new GeneralSummarizer(completor);
    const webpageSummarizer = new WebpageSummarizer(completor);
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

        // Use summarizer to summarize the results' contents up to summarizedCount
        const summarizedCount = 3;
        // create partial summaries
        const partialSummaryPromises: Promise<string>[] = [];
        const htmlContentPromises: Promise<string | null>[] = [];
        for (let i = 0; i < summarizedCount; ++i) {
            const webpage = searchResult.webPages?.value[i];
            if (webpage?.url) {
                console.log(`${i}-th URL: <${webpage.url}>`)
                htmlContentPromises.push(scraper.urlToHtml(webpage.url));
            };
        }
        for (const htmlContent of await Promise.all(htmlContentPromises)) {
            if (!htmlContent) {
                partialSummaryPromises.push(new Promise(resolve => {resolve('Fail to load webpage content.');}));
            }
            else {
                const summary = partialSummarizer.summarize(query, htmlContent);
                partialSummaryPromises.push(summary)
            }
        }
        // create summaries for each webpage as well as general summary
        const partialSummaries = await Promise.all(partialSummaryPromises);
        const generalSummary = await generalSummarizer.summarize(query, partialSummaries);
        const webpageSummariesPromises = partialSummaries.map(summary => webpageSummarizer.summarize(query, summary));
        const webpageSummaries = await Promise.all(webpageSummariesPromises);
        for (let i = 0; i < summarizedCount; ++i) {
            const webpage = searchResult.webPages?.value[i];
            if (webpage?.url) {
                webpage.snippet = webpageSummaries[i];
            }
        }

        return {
            statusCode: 200,
            body: JSON.stringify({searchResult: searchResult, generalSummary: generalSummary}),
            headers: {
                'Content-Type': 'application/json'
            }
        };
    } catch (e)  {
        console.error(`500 error when fetching search API results. Error: ${e}`);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: `HTTP error when fetching search API results. Error: ${e}` }),
            headers: {
                'Content-Type': 'application/json'
            }
        };
    }
};