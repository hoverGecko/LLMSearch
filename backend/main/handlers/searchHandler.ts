import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import BingSearchService from '../src/BingSearch/BingSearchService';
import { createJsonResponse, handleError } from './lambdaHandlerUtils';
import OpenRouterCompletor from '../src/LLMPromptCompleter/OpenRouterCompletor';
import { ChatCompletionMessageParam } from 'openai/resources';


export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    // Handle OPTIONS request for CORS preflight
    if (event.httpMethod === 'OPTIONS') {
        return createJsonResponse(200, {});
    }

    const query = event.queryStringParameters?.['q'];
    if (!query) {
        return createJsonResponse(400, { error: 'Missing search query string "q" e.g. "/search?q=apple".' });
    }

    const { BING_API_KEY, OPEN_ROUTER_API_KEY } = process.env;
    if (!BING_API_KEY) {
        console.error('Server configuration error: Missing BING_API_KEY.');
        return createJsonResponse(500, { error: 'Server configuration error (Bing).' });
    }
    if (!OPEN_ROUTER_API_KEY) {
         console.warn('Server configuration warning: Missing OPENROUTER_API_KEY. LLM Search features will be limited.');
    }

    const searchService = new BingSearchService(BING_API_KEY);
    // Use the same model as chatHandler for consistency, unless specified otherwise
    // Constructor likely only takes model name; API key is read from process.env internally
    const completor = OPEN_ROUTER_API_KEY ? new OpenRouterCompletor('google/gemini-2.0-flash-001') : null;

    try {
        let alternativeQueries: string[] = [];
        if (completor) {
            try {
                console.log(`Generating alternative queries for: "${query}"`);
                const generateQueryPrompt: ChatCompletionMessageParam[] = [
                    {
                        role: 'system',
                        content: "Given the user query, generate up to 3 alternative search queries that explore different facets or interpretations. Return only the queries, one per line. Do not include the original query in the list."
                    },
                    { role: 'user', content: query }
                ];
                const llmResponse = await completor.complete(generateQueryPrompt);
                alternativeQueries = llmResponse.split('\n').map(q => q.trim()).filter(q => q.length > 0);
                console.log('Alternative queries generated:', alternativeQueries);
            } catch (llmError) {
                console.error('Error generating alternative queries with LLM:', llmError);
                // Proceed without alternative queries if LLM fails
            }
        }

        const allQueries = [query, ...alternativeQueries];
        console.log('Performing searches for queries:', allQueries);

        // Perform searches in parallel
        const searchPromises = allQueries.map(q => searchService.search(q));
        const searchResults = await Promise.allSettled(searchPromises);

        console.log('All Bing searches completed.');

        // Aggregate and deduplicate results
        const aggregatedWebPages = new Map<string, WebPage>(); // Use URL as key for deduplication

        searchResults.forEach((result, index) => {
            const currentQuery = allQueries[index];
            if (result.status === 'fulfilled') {
                const searchResponse = result.value;
                if (searchResponse._type === 'SearchResponse' && searchResponse.webPages?.value) {
                    console.log(`Found ${searchResponse.webPages.value.length} results for query: "${currentQuery}"`);
                    searchResponse.webPages.value.forEach(page => {
                        if (!aggregatedWebPages.has(page.url)) {
                            aggregatedWebPages.set(page.url, page);
                        }
                    });
                } else if (searchResponse._type === 'ErrorResponse') {
                    console.error(`Bing API returned an error for query "${currentQuery}":`, searchResponse.errors);
                } else {
                     console.log(`No web pages found for query: "${currentQuery}"`);
                }
            } else {
                console.error(`Search failed for query "${currentQuery}":`, result.reason);
            }
        });

        const deduplicatedWebPages: WebPage[] = Array.from(aggregatedWebPages.values());
        console.log(`Total unique web pages found: ${deduplicatedWebPages.length}`);

        if (deduplicatedWebPages.length === 0) {
            // If no results after aggregation, return an empty list within the expected structure
             const emptySearchResult: Partial<SearchResponse> = {
                 _type: "SearchResponse",
                 webPages: { value: [], id: "", someResultsRemoved: false, totalEstimatedMatches: 0, webSearchUrl: "" },
                 queryContext: { originalQuery: query, adultIntent: false, askUserForLocation: false },
                 rankingResponse: { mainline: { items: [] }, pole: { items: [] }, sidebar: { items: [] } }
             };
            return createJsonResponse(200, { searchResult: emptySearchResult });
        }

        let rankedWebPages: WebPage[] = [...deduplicatedWebPages]; // Default to unranked if LLM fails or is disabled

        if (completor && deduplicatedWebPages.length > 1) { // Only rank if there's something to rank and LLM is available
             try {
                 console.log(`Re-ranking ${deduplicatedWebPages.length} results for query: "${query}"`);
                 const resultsToRankText = deduplicatedWebPages
                     .map((page, i) => `${i + 1}. URL: ${page.url}\n   Snippet: ${page.snippet}`)
                     .join('\n\n');

                 const rerankPrompt: ChatCompletionMessageParam[] = [
                     { role: 'system', content: `Based on the original user query, re-rank the following search results (URL and snippet) from most relevant to least relevant. Return only the list of URLs in the desired order, one URL per line. Ensure all original URLs are present in the output exactly once.` },
                     { role: 'user', content: `Original Query: ${query}\n\nResults:\n${resultsToRankText}` }
                 ];

                 const llmResponse = await completor.complete(rerankPrompt);
                 const rankedUrls = llmResponse.split('\n').map(url => url.trim()).filter(url => url.length > 0);
                 console.log('LLM ranked URLs:', rankedUrls);

                 // Create a map for quick lookup
                 const pageMap = new Map(deduplicatedWebPages.map(page => [page.url, page]));
                 const newlyRankedPages: WebPage[] = [];
                 const seenUrls = new Set<string>();

                 // Add pages based on LLM ranking
                 rankedUrls.forEach(url => {
                     const page = pageMap.get(url);
                     // Skip URL if it is a duplicate
                     if (page && !seenUrls.has(url)) {
                         newlyRankedPages.push(page);
                         seenUrls.add(url);
                     } else {
                         console.warn(`LLM returned URL not in original list or duplicate: ${url}`);
                     }
                 });

                 // Add any pages the LLM might have missed, ensuring no duplicates are added here either
                 deduplicatedWebPages.forEach(page => {
                     if (!seenUrls.has(page.url)) { // Double-check if the URL is already seen
                         console.warn(`LLM missed ranking for URL: ${page.url}. Appending to end.`);
                         newlyRankedPages.push(page);
                         seenUrls.add(page.url); // Mark as seen here too
                     }
                 });

                 if (newlyRankedPages.length === deduplicatedWebPages.length) {
                    rankedWebPages = newlyRankedPages; // Use the LLM ranking if valid
                    console.log('Successfully applied LLM re-ranking.');
                 } else {
                    console.error('LLM re-ranking resulted in a different number of results. Falling back to unranked.');
                 }

             } catch (llmError) {
                 console.error('Error during LLM re-ranking:', llmError);
                 // Fallback to unranked list (already default)
             }
        } else if (deduplicatedWebPages.length <= 1) {
             console.log('Skipping re-ranking as there is only one or zero results.');
        } else {
             console.log('Skipping re-ranking as LLM completor is not available.');
        }


        // Construct the final search result object using the (potentially) ranked pages
        const finalSearchResult: Partial<SearchResponse> = {
             _type: "SearchResponse", // Indicate it's a search response
             webPages: {
                 value: rankedWebPages, // Use the ranked list
                 // Add other required fields from WebAnswer if necessary, potentially with default/dummy values
                 id: "", // Placeholder
                 someResultsRemoved: false, // Placeholder - Bing might indicate this, could try to preserve if needed
                 totalEstimatedMatches: rankedWebPages.length, // Reflect the count of pages we're returning
                 webSearchUrl: "" // Placeholder - Bing provides this, could try to preserve if needed
             },
             // Add other required fields from SearchResponse if necessary
             queryContext: { originalQuery: query, adultIntent: false, askUserForLocation: false }, // Placeholder - Bing provides this
             rankingResponse: { mainline: { items: [] }, pole: { items: [] }, sidebar: { items: [] } } // Placeholder - Bing provides this, might be complex to reconstruct meaningfully
        };

        // Return the final result, potentially using a new key if frontend needs distinction
        // Sticking with 'searchResult' for now for simplicity unless frontend requires 'rankedSearchResult'
        return createJsonResponse(200, { searchResult: finalSearchResult });

    } catch (e) {
        return handleError(e, 'Error during search processing');
    }
};
