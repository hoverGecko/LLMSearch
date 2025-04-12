import { StyleSheet, View, Platform } from 'react-native';
import { backendUrl, apiKey } from '@/constants/Constants';
import { Redirect, useLocalSearchParams } from 'expo-router';
import { useEffect, useState, useRef } from 'react';
import { ThemedText } from '@/components/ThemedText';
import SearchBar from '@/components/SearchBar';
import Animated, { useAnimatedRef } from 'react-native-reanimated';
import { useThemeColor } from '@/hooks/useThemeColor';
import { ExternalLink } from '@/components/ExternalLink';
import ResultContainer from '@/components/ResultContainer';
import { ActivityIndicator, Text } from 'react-native-paper';

// Define types for better state management
// pending: Initial state
// partial_loading: Fetching partial summary from /process-url
// partial_error: Error fetching partial summary
// summary_loading: Fetching final webpage summary from /generate-webpage-summary
// loaded: Final webpage summary loaded successfully
// summary_error: Error fetching final webpage summary
type ResultStatus = 'pending' | 'partial_loading' | 'partial_error' | 'summary_loading' | 'loaded' | 'summary_error';
type GeneralSummaryStatus = 'pending' | 'loading' | 'loaded' | 'error';


interface DetailedResult {
    id: string;
    name: string;
    url: string;
    status: ResultStatus;
    partialSummary: string | null; // Still store partial summary internally
    finalSummary: string | null; // Stores the final webpage-specific summary
    error?: string; // Store error messages
}

// --- Individual Search Result Component ---
const SearchResultItem = (params: { result: DetailedResult }) => {
    const { result } = params;
    return (
        <View style={styles.resultItemContainer}>
            {/* Link and URL remain the same */}
            <ExternalLink style={styles.resultTitle} href={result.url}>{result.name}</ExternalLink>
            <ExternalLink style={styles.resultUrl} href={result.url}>{result.url}</ExternalLink>

            <View style={styles.summaryContainer}>
                {/* Show loading indicator during both partial and final summary fetching */}
                {(result.status === 'partial_loading' || result.status === 'summary_loading') && (
                    <ActivityIndicator animating={true} size="small" style={styles.loadingIndicator} />
                )}
                {/* Show final summary only when fully loaded */}
                {result.status === 'loaded' && result.finalSummary && (
                    <ThemedText style={styles.resultContent} numberOfLines={10}>
                        {result.finalSummary}
                    </ThemedText>
                )}
                 {/* Show error message if either step failed */}
                 {(result.status === 'partial_error' || result.status === 'summary_error') && (
                    <ThemedText style={[styles.resultContent, styles.errorText]}>
                        Error: {result.error || 'Failed to load summary.'}
                    </ThemedText>
                )}
                 {/* Show placeholder if loaded but summary is empty/null */}
                 {result.status === 'loaded' && !result.finalSummary && (
                     <ThemedText style={[styles.resultContent, styles.placeholderText]}>
                        Could not generate summary for this page.
                    </ThemedText>
                 )}
                 {/* 'pending' state shows nothing */}
            </View>
        </View>
    );
}

// --- Main Search Screen Component ---
export default function SearchScreen() {
    const backgroundColor = useThemeColor({}, 'background');
    const params = useLocalSearchParams<{ q: string }>();
    const query = params.q;

    const [initialResults, setInitialResults] = useState<any[]>([]);
    const [detailedResults, setDetailedResults] = useState<DetailedResult[]>([]);
    const [generalSummary, setGeneralSummary] = useState<string | null>(null);
    const [generalSummaryStatus, setGeneralSummaryStatus] = useState<GeneralSummaryStatus>('pending'); // Use specific type

    const scrollRef = useAnimatedRef<Animated.ScrollView>();
    const generalSummaryFetchTriggered = useRef(false); // Use ref to track if general summary fetch has started

    // --- Effect 1: Fetch initial search results ---
    useEffect(() => {
        if (!query) return;

        // Reset state for new query
        setInitialResults([]);
        setDetailedResults([]);
        setGeneralSummary(null);
        setGeneralSummaryStatus('pending');
        generalSummaryFetchTriggered.current = false; // Reset trigger

        const headers: HeadersInit = {};
        if (apiKey) {
            headers['x-api-key'] = apiKey;
        } else if (Platform.OS !== 'web') { // Don't warn excessively on web during local dev if key is missing
             console.warn('API Key is missing, requests to deployed backend will fail.');
        }


        console.log(`Fetching initial results for query: ${query}`);
        fetch(`${backendUrl}/search?${new URLSearchParams({ q: query })}`, { headers })
            .then(res => {
                if (!res.ok) {
                    // Log more details on failure
                    console.error(`Search API failed with status ${res.status}`, res);
                    throw new Error(`Search API failed with status ${res.status}`);
                }
                return res.json();
            })
            .then(apiResult => {
                const results = apiResult.searchResult?.webPages?.value || [];
                console.log(`Received ${results.length} initial results.`);
                setInitialResults(results);
                // Initialize detailed results state
                const topN = 3; // Process top 3 results
                setDetailedResults(results.slice(0, topN).map((r: any) => ({
                    id: r.id,
                    name: r.name,
                    url: r.url,
                    status: 'pending', // Start as pending
                    partialSummary: null,
                    finalSummary: null,
                })));
            })
            .catch(e => {
                console.error('Error fetching initial search results:', e);
                // Handle error state appropriately (e.g., show error message)
                setGeneralSummaryStatus('error'); // Indicate overall error
            });
    }, [query]); // Rerun only when query changes

    // --- Effect 2: Process individual URLs ---
    useEffect(() => {
        if (!query || detailedResults.length === 0) return;

        detailedResults.forEach((result, index) => {
            // Only process if status is 'pending'
            if (result.status === 'pending') {
                // --- Show General Summary loading spinner early ---
                // If this is the first item being processed, set general summary to loading
                if (index === 0 && generalSummaryStatus === 'pending') {
                    setGeneralSummaryStatus('loading');
                }
                // --- End early spinner logic ---

                console.log(`Processing URL ${index + 1}: ${result.url}`);
                // Update status to 'loading' immediately
                setDetailedResults(prev => prev.map(item =>
                    item.id === result.id ? { ...item, status: 'partial_loading' } : item // Update status
                ));

                // Prepare headers for POST request (common for both)
                const commonPostHeaders: HeadersInit = { 'Content-Type': 'application/json' };
                if (apiKey) { commonPostHeaders['x-api-key'] = apiKey; }

                // --- Fetch Partial Summary ---
                fetch(`${backendUrl}/process-url`, {
                    method: 'POST',
                    headers: commonPostHeaders,
                    body: JSON.stringify({ url: result.url, query: query }),
                })
                .then(res => {
                    if (!res.ok) { throw new Error(`Partial summary fetch failed (${res.status})`); }
                    return res.json();
                })
                .then(partialData => {
                    const partialSummary = partialData.partialSummary;
                    const partialError = partialData.error;

                    if (!partialSummary) {
                        // If partial summary failed, mark error and stop for this item
                        console.warn(`Partial summary failed for ${result.url}: ${partialError}`);
                        setDetailedResults(prev => prev.map(item =>
                            item.id === result.id ? { ...item, status: 'partial_error', error: partialError || 'Failed to load content' } : item
                        ));
                        return; // Don't proceed to fetch final summary
                    }

                    // Partial summary success - update state and immediately fetch final summary
                    console.log(`Partial summary received for ${result.url}, fetching final summary...`);
                    setDetailedResults(prev => prev.map(item =>
                        item.id === result.id ? { ...item, status: 'summary_loading', partialSummary: partialSummary } : item
                    ));

                    // --- Fetch Final Webpage Summary ---
                    fetch(`${backendUrl}/generate-webpage-summary`, { // New endpoint
                        method: 'POST',
                        headers: commonPostHeaders,
                        body: JSON.stringify({ query: query, partialSummary: partialSummary }), // Send single partial summary
                    })
                    .then(res => {
                        if (!res.ok) { throw new Error(`Webpage summary fetch failed (${res.status})`); }
                        return res.json();
                    })
                    .then(summaryData => {
                        console.log(`Final webpage summary received for ${result.url}`);
                        setDetailedResults(prev => prev.map(item =>
                            item.id === result.id ? {
                                ...item,
                                status: 'loaded', // Final success state
                                finalSummary: summaryData.webpageSummary // Store final summary
                            } : item
                        ));
                    })
                    .catch(e => {
                        // Handle error fetching final summary
                        console.error(`Error fetching final webpage summary for ${result.url}:`, e);
                        setDetailedResults(prev => prev.map(item =>
                            item.id === result.id ? { ...item, status: 'summary_error', error: e.message } : item
                        ));
                    });
                })
                .catch(e => {
                    // Handle error fetching partial summary
                    console.error(`Error fetching partial summary for ${result.url}:`, e);
                    setDetailedResults(prev => prev.map(item =>
                        item.id === result.id ? { ...item, status: 'partial_error', error: e.message } : item
                    ));
                });
            }
        });
    }, [query, detailedResults]); // Dependencies remain the same

    // --- Effect 3: Generate GENERAL summary ---
    useEffect(() => {
        // Check if already triggered or no results
        if (!query || detailedResults.length === 0 || generalSummaryFetchTriggered.current) {
            return;
        }

        // Check if all results have at least finished the partial summary step (success or fail)
        const allPartialsProcessed = detailedResults.every(r =>
            r.status !== 'pending' && r.status !== 'partial_loading'
        );

        if (allPartialsProcessed) {
            console.log('All partial summaries processed, triggering general summary generation.');
            generalSummaryFetchTriggered.current = true; // Set trigger flag
            // No need to set loading here, it was set earlier in Effect 2
            // setGeneralSummaryStatus('loading');

            // Collect partial summaries (use null for those that failed)
            const partialSummaries = detailedResults.map(r => r.partialSummary);

            // Prepare headers
            const postHeaders: HeadersInit = { 'Content-Type': 'application/json' };
            if (apiKey) { postHeaders['x-api-key'] = apiKey; }

            // Fetch General Summary
            fetch(`${backendUrl}/generate-general-summary`, { // New endpoint
                method: 'POST',
                headers: postHeaders,
                body: JSON.stringify({ query: query, partialSummaries: partialSummaries }),
            })
            .then(res => {
                 if (!res.ok) {
                    console.error(`General Summary API failed with status ${res.status}`, res);
                    throw new Error(`General Summary API failed with status ${res.status}`);
                }
                return res.json();
            })
            .then(data => {
                console.log('Final summaries received.');
                setGeneralSummary(data.generalSummary);
                setGeneralSummaryStatus('loaded');
                // BUG FIX: Remove the incorrect update to detailedResults here
                // finalSummary is correctly set in Effect 2
            })
            .catch(e => {
                console.error('Error generating general summary:', e); // Corrected error message context
                setGeneralSummary('Error generating final summary.');
                setGeneralSummaryStatus('error');
            });
        }
    }, [query, detailedResults]); // Rerun when query or detailedResults content changes

    // --- Render Logic ---
    if (!query) {
        return <Redirect href='/' />;
    }

    return (
        <Animated.ScrollView
            style={[{ backgroundColor }, styles.container]}
            ref={scrollRef}
            scrollEventThrottle={16}
        >
            <SearchBar value={query} />

            <ResultContainer
                title="General Summary"
                // Show loading based on status, ensure it's loaded only when summary is non-null
                loaded={generalSummaryStatus === 'loaded' && !!generalSummary}
                loading={generalSummaryStatus === 'loading'}
                error={generalSummaryStatus === 'error'}
            >
                {generalSummaryStatus === 'loaded' && generalSummary && (
                    <Text style={styles.resultContent}>
                        {generalSummary}
                    </Text>
                )}
                 {generalSummaryStatus === 'error' && (
                     <Text style={[styles.resultContent, styles.errorText]}>
                        {generalSummary || 'Failed to load general summary.'}
                    </Text>
                 )}
            </ResultContainer>

            <ResultContainer
                title="Results"
                // Considered loaded if we have initial results, individual items handle their own loading state
                loaded={initialResults.length > 0 || detailedResults.length > 0}
                // No top-level loading/error here, handled per item
            >
                {detailedResults.map((r) => <SearchResultItem key={r.id} result={r} />)}
                {/* Show message if no results were found initially */}
                {initialResults.length === 0 && detailedResults.length === 0 && generalSummaryStatus !== 'pending' && (
                    <ThemedText>No results found for "{query}".</ThemedText>
                )}
            </ResultContainer>
        </Animated.ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 20,
        flex: 1, // Ensure ScrollView takes full height if needed
    },
    // headerImage styles removed as not used in current logic
    titleContainer: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 10, // Add some space below title
    },
    resultItemContainer: {
        marginBottom: 20, // Space between result items
    },
    resultTitle: {
        color: '#0000EE',
        textDecorationLine: 'underline',
        fontSize: 18,
        alignSelf: "flex-start",
        marginBottom: 2,
    },
    resultUrl: {
        fontSize: 12,
        color: '#555555',
        alignSelf: "flex-start",
        marginBottom: 5,
    },
    summaryContainer: {
        marginTop: 5,
        minHeight: 30, // Ensure space for loading indicator
    },
    resultContent: {
        fontSize: 14,
    },
    loadingIndicator: {
        // Align indicator nicely
        alignSelf: 'flex-start',
        marginLeft: 10,
    },
    errorText: {
        color: 'red', // Make errors stand out
    },
    placeholderText: {
        color: '#888', // Grey color for placeholder
        fontStyle: 'italic',
    },
    // loadingContainer styles removed as loading is handled within ResultContainer/SearchResultItem
});
