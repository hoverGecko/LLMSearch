import { StyleSheet, Platform, View } from 'react-native';
import { backendUrl, apiKey } from '@/constants/Constants';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState, useCallback } from 'react';
import { ThemedText } from '@/components/ThemedText';
import SearchBar from '@/components/SearchBar';
import Animated, { useAnimatedRef } from 'react-native-reanimated';
import { useThemeColor } from '@/hooks/useThemeColor';
import ResultContainer from '@/components/ResultContainer';
import SearchResultItem, { InitialResult, DetailedResult } from '@/components/SearchResultItem';
import GeneralSummaryChat from '@/components/GeneralSummaryChat';

type SearchResultStatus = 'pending' | 'loading' | 'loaded' | 'error';

export default function SearchScreen() {
    const router = useRouter();
    const backgroundColor = useThemeColor({}, 'background');
    const tintColor = useThemeColor({}, 'tint') || "lightblue"; // Use 'tint' for the accent color
    const params = useLocalSearchParams<{ q: string }>();
    const query = params.q;
    const topN = 5; // Define how many results to process automatically

    const [initialResults, setInitialResults] = useState<InitialResult[]>([]);
    const [detailedResults, setDetailedResults] = useState<DetailedResult[]>([]);
    const [searchResultStatus, setSearchResultStatus] = useState<SearchResultStatus>('pending');

    const scrollRef = useAnimatedRef<Animated.ScrollView>();

    useEffect(() => {
        if (!query) return;

        setInitialResults([]);
        setDetailedResults([]);
        setSearchResultStatus('pending'); // Reset status used for isLoadingInitial

        const headers: HeadersInit = {};
        if (apiKey) headers['x-api-key'] = apiKey;
        else if (Platform.OS !== 'web') console.warn('API Key missing.');

        console.log(`Fetching initial results for query: ${query}`);
        setSearchResultStatus('loading'); // Set loading state immediately
        fetch(`${backendUrl}/search?${new URLSearchParams({ q: query })}`, { headers })
            .then(res => {
                if (!res.ok) {
                     setSearchResultStatus('error'); // Set error if fetch fails
                     throw new Error(`Search API failed (${res.status})`);
                }
                return res.json();
            })
            .then(apiResult => {
                const results: InitialResult[] = apiResult.searchResult?.webPages?.value || [];
                console.log(`Received ${results.length} initial results.`);
                setInitialResults(results);

                // Initialize detailed results state ONLY for top N
                setDetailedResults(results.slice(0, topN).map(r => ({
                    id: r.id, // Use imported type
                    name: r.name,
                    url: r.url,
                    snippet: r.snippet,
                    status: 'pending', // Use imported type
                    partialSummary: null,
                    webpageSummary: null,
                })));
            })
            .catch(e => {
                console.error('Error fetching initial search results:', e);
                setSearchResultStatus('error'); // Indicate overall error if search fails
            });
    }, [query, topN]);

    const handleGenerateSummary = useCallback((url: string) => {
        // Check if already processing/processed using URL
        if (detailedResults.some(dr => dr.url === url)) {
            console.log(`Summary generation already initiated or completed for ${url}`);
            return;
        }

        // Find the corresponding initial result using URL
        const resultToAdd = initialResults.find(ir => ir.url === url);
        if (resultToAdd) {
            console.log(`Adding result for ${url} to detailed processing queue.`);
            setDetailedResults(prev => [
                ...prev,
                { // Keep the original id from Bing, but use URL for matching logic
                    id: resultToAdd.id, // Keep original id
                    name: resultToAdd.name,
                    url: resultToAdd.url, // url is the key identifier now
                    snippet: resultToAdd.snippet,
            status: 'pending', // Use imported type
                    partialSummary: null,
                    webpageSummary: null,
                }
            ]);
        }
    }, [initialResults, detailedResults]); // Dependencies for the callback - initialResults needed for find

    useEffect(() => {
        if (!query || detailedResults.length === 0) return;

        // Find results that are 'pending' and process them
        const pendingResults = detailedResults.filter(r => r.status === 'pending');

        if (pendingResults.length === 0) return; // No pending results to process
        pendingResults.forEach((result) => {
            console.log(`Processing URL: ${result.url}`);
            // Update status to 'partial_loading' immediately for this specific item using URL matching
            setDetailedResults(prev => prev.map(item =>
                item.url === result.url ? { ...item, status: 'partial_loading' } : item
            ));

            const commonPostHeaders: HeadersInit = { 'Content-Type': 'application/json' };
            if (apiKey) commonPostHeaders['x-api-key'] = apiKey;

            fetch(`${backendUrl}/process-url`, {
                method: 'POST',
                headers: commonPostHeaders,
                body: JSON.stringify({ url: result.url, query: query }),
            })
            .then(res => {
                if (!res.ok) throw new Error(`Partial summary fetch failed (${res.status})`);
                return res.json();
            })
            .then(partialData => {
                const partialSummary = partialData.partialSummary;
                const partialError = partialData.error;

                if (!partialSummary) {
                    console.warn(`Partial summary failed for ${result.url}: ${partialError}`);
                    // Update status using URL matching
                    setDetailedResults(prev => prev.map(item =>
                        item.url === result.url ? { ...item, status: 'partial_error', error: partialError || 'Failed to load content' } : item
                    ));
                    return;
                }

                console.log(`Partial summary received for ${result.url}, fetching final summary...`);
                 // Update status and store partial summary using URL matching
                setDetailedResults(prev => prev.map(item =>
                    item.url === result.url ? { ...item, status: 'summary_loading', partialSummary: partialSummary } : item
                ));

                fetch(`${backendUrl}/generate-webpage-summary`, {
                    method: 'POST',
                    headers: commonPostHeaders,
                    body: JSON.stringify({ query: query, partialSummary: partialSummary }),
                })
                .then(res => {
                    if (!res.ok) throw new Error(`Webpage summary fetch failed (${res.status})`);
                    return res.json();
                })
                .then(summaryData => {
                    console.log(`Final webpage summary received for ${result.url}`);
                    // Update status and store final summary using URL matching
                    setDetailedResults(prev => prev.map(item =>
                        item.url === result.url ? {
                            ...item,
                            status: 'loaded',
                            webpageSummary: summaryData.webpageSummary
                        } : item
                    ));
                })
                .catch(e => {
                    console.error(`Error fetching final webpage summary for ${result.url}:`, e);
                     // Update status using URL matching
                    setDetailedResults(prev => prev.map(item =>
                        item.url === result.url ? { ...item, status: 'summary_error', error: e.message } : item
                    ));
                });
            })
            .catch(e => {
                console.error(`Error fetching partial summary for ${result.url}:`, e);
                 // Update status using URL matching
                setDetailedResults(prev => prev.map(item =>
                    item.url === result.url ? { ...item, status: 'partial_error', error: e.message } : item
                ));
            });
        });
    }, [query, detailedResults, topN]);

    if (!query) {
        return <Redirect href='/' />;
    }

    const handleSuggestionSearch = useCallback((suggestion: string) => {
        console.log(`Navigating to new search for suggestion: ${suggestion}`);
        router.push(`/search?q=${encodeURIComponent(suggestion)}`);
    }, [router]);

    const isLoadingInitial = initialResults.length === 0 && searchResultStatus === 'pending'; // Loading initial /search

    return (
        <Animated.ScrollView
            style={[{ backgroundColor }, styles.container]}
            ref={scrollRef}
            scrollEventThrottle={16}
        >
            <SearchBar value={query} />
            <GeneralSummaryChat
                query={query}
                initialResults={initialResults}
                detailedResults={detailedResults}
                topN={topN}
                onSuggestionClick={handleSuggestionSearch} // Pass the callback
            />
            <ResultContainer
                title="Results"
                loaded={initialResults.length > 0 || searchResultStatus === 'error'} // Show container once initial results arrive or if search failed
                loading={!initialResults.length}
            >
                {initialResults.map((initialRes, index) => {
                    // Find detailed result using URL
                    const detailedRes = detailedResults.find(dr => dr.url === initialRes.url);
                    const isTopNItem = index < topN;
                    return (
                        <SearchResultItem
                            key={initialRes.url} // Use URL as the key, guaranteed unique by backend deduplication
                            initialResult={initialRes}
                            detailedResult={detailedRes}
                            isTopN={isTopNItem}
                            // Pass URL to the handler
                            onGenerateSummary={() => handleGenerateSummary(initialRes.url)}
                            indicatorColor={tintColor}
                        />
                    );
                })}
                {/* Show message if initial search returned no results AND wasn't an error */}
                {!isLoadingInitial && initialResults.length === 0 && searchResultStatus !== 'error' && (
                    <ThemedText>No results found for "{query}".</ThemedText>
                )}
                 {/* Show message if initial search itself failed */}
                 {searchResultStatus === 'error' && initialResults.length === 0 && (
                     <ThemedText style={styles.errorText}>Failed to fetch search results.</ThemedText>
                 )}
            </ResultContainer>
        </Animated.ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 20,
        flex: 1,
    },
    titleContainer: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 10, // Add some space below title
    },
    resultContent: {
        fontSize: 14,
        lineHeight: 20,
    },
     errorText: {
        color: 'red',
    }
});
