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

                setDetailedResults(results.slice(0, topN).map(r => ({
                    id: r.id,
                    name: r.name,
                    url: r.url,
                    snippet: r.snippet,
                    status: 'pending',
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
        if (detailedResults.some(dr => dr.url === url)) {
            console.log(`Summary generation already initiated or completed for ${url}`);
            return;
        }

        const resultToAdd = initialResults.find(ir => ir.url === url);
        if (resultToAdd) {
            console.log(`Adding result for ${url} to detailed processing queue.`);
            setDetailedResults(prev => [
                ...prev,
                {
                    id: resultToAdd.id,
                    name: resultToAdd.name,
                    url: resultToAdd.url,
                    snippet: resultToAdd.snippet,
                    status: 'pending',
                    partialSummary: null,
                    webpageSummary: null,
                }
            ]);
        }
    }, [initialResults, detailedResults]);

    useEffect(() => {
        if (!query || detailedResults.length === 0) return;

        const pendingResults = detailedResults.filter(r => r.status === 'pending');

        if (pendingResults.length === 0) return;
        pendingResults.forEach((result) => {
            console.log(`Processing URL: ${result.url}`);
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
                    setDetailedResults(prev => prev.map(item =>
                        item.url === result.url ? { ...item, status: 'partial_error', error: partialError || 'Failed to load content' } : item
                    ));
                    return;
                }

                console.log(`Partial summary received for ${result.url}, fetching final summary...`);
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
                     setDetailedResults(prev => prev.map(item =>
                        item.url === result.url ? { ...item, status: 'summary_error', error: e.message } : item
                    ));
                });
            })
            .catch(e => {
                console.error(`Error fetching partial summary for ${result.url}:`, e);
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

    const isLoadingInitial = initialResults.length === 0 && searchResultStatus === 'pending';

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
                    const detailedRes = detailedResults.find(dr => dr.url === initialRes.url);
                    const isTopNItem = index < topN;
                    return (
                        <SearchResultItem
                            key={initialRes.url}
                            initialResult={initialRes}
                            detailedResult={detailedRes}
                            isTopN={isTopNItem}
                            onGenerateSummary={() => handleGenerateSummary(initialRes.url)}
                            indicatorColor={tintColor}
                        />
                    );
                })}
                {!isLoadingInitial && initialResults.length === 0 && searchResultStatus !== 'error' && (
                    <ThemedText>No results found for "{query}".</ThemedText>
                )}
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
        marginBottom: 10,
    },
    resultContent: {
        fontSize: 14,
        lineHeight: 20,
    },
     errorText: {
        color: 'red',
    }
});
