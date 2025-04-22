import { ErrorResponse, SearchResponse } from "./BingSearchResult";

export default class BingSearchService {
    constructor(protected apiKey: string) {}

    search = async (query: string): Promise<SearchResponse | ErrorResponse> => {
        const searchUrl = `https://api.bing.microsoft.com/v7.0/search?q=${encodeURIComponent(query)}`;

        const response = await fetch(searchUrl, {
            method: 'GET',
            headers: {
                'Ocp-Apim-Subscription-Key': this.apiKey,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error when using Bing search service. HTTP status: ${response.status}.`);
        }

        return await response.json();
    };
}