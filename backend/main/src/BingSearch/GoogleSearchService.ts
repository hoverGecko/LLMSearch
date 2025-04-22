import BingSearchService from "./BingSearchService";
import { google, customsearch_v1 } from "googleapis"; // Import specific type
import { WebPage, SearchResponse, ErrorResponse } from "./BingSearchResult"; // Import necessary types
import { randomUUID } from "crypto";

export default class GoogleSearchService extends BingSearchService {
    private readonly searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID;
    private readonly customSearch = google.customsearch('v1');
    constructor(apiKey: string) {
        super(apiKey);
    }
    
    /**
     * Converts a single Google Custom Search result item to the Bing WebPage format.
     * @param item A single result item from the Google Custom Search API response.
     * @param index The index of the item in the original results list (used for generating a unique ID).
     * @returns A WebPage object representing the converted search result.
     */
    private _googleToBing = (item: customsearch_v1.Schema$Result, index: number): WebPage => {
        const url = item.link || '';
        return {
            id: `${randomUUID()}_${index}`, // Unique ID for the webpage result
            name: item.title || url,
            url: url,
            snippet: item.snippet || 'No Snippet Available',
            displayUrl: item.displayLink || url, // Use displayLink if available, else fallback to url
            isFamilyFriendly: true, // Assume family friendly
            isNavigational: false,
            language: 'en', // default to en
            dateLastCrawled: new Date().toISOString(), // Placeholder
            datePublished:  new Date().toISOString(), // Placeholder
            datePublishedDisplayText:  new Date().toISOString(), // Placeholder
        };
    }

    // Note: The 'search' method below still needs to be updated
    // to use the 'googleToBing' function to process the results.
    search = async (query: string): Promise<SearchResponse | ErrorResponse> => {
        const response = await this.customSearch.cse.list({
            auth: this.apiKey,
            cx: this.searchEngineId,
            q: query
        })

        const result = response.data.items;
        if (!result) {
            throw new Error("google search result is undefined.");
        }
        
        const finalSearchResult: SearchResponse = {
            _type: "SearchResponse",
            webPages: {
                value: result.map(this._googleToBing),
                id: "",
                someResultsRemoved: false,
                totalEstimatedMatches: result.length,
                webSearchUrl: ""
            },
            queryContext: { originalQuery: query, adultIntent: false, askUserForLocation: false },
            rankingResponse: { mainline: { items: [] }, pole: { items: [] }, sidebar: { items: [] } }
       };

        return finalSearchResult;
    };
}
