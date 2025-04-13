import { StyleSheet, View, Platform } from 'react-native';
import { backendUrl, apiKey } from '@/constants/Constants';
import { Redirect, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState, useRef, useCallback, memo } from 'react';
import { ThemedText } from '@/components/ThemedText';
import SearchBar from '@/components/SearchBar';
import Animated, { useAnimatedRef, FadeIn, FadeOut } from 'react-native-reanimated';
import { useThemeColor } from '@/hooks/useThemeColor';
import { ExternalLink } from '@/components/ExternalLink';
import ResultContainer from '@/components/ResultContainer';
import { Text, Button, Chip } from 'react-native-paper';
import LoadingIndicator from '@/components/LoadingIndicator';

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
    snippet?: string; // Add snippet from initial Bing result
    status: ResultStatus;
    partialSummary: string | null;
    finalSummary: string | null;
    error?: string;
}

// Interface for the initial Bing result structure (adjust based on actual API response)
interface InitialResult {
    id: string;
    name: string;
    url: string;
    snippet: string; // Assuming Bing provides a snippet
    // Add other fields from Bing if needed
}

// --- Individual Search Result Component ---
const SearchResultItem = memo((params: { // Use memo directly
    initialResult: InitialResult;
    detailedResult: DetailedResult | undefined;
    isTopN: boolean;
    onGenerateSummary: (id: string) => void;
    indicatorColor: string;
}) => {
    const { initialResult, detailedResult, isTopN, onGenerateSummary, indicatorColor } = params;
    const [isExpanded, setIsExpanded] = useState(false);

    const handleGenerateClick = () => {
        onGenerateSummary(initialResult.id);
    };

    const handleExpandClick = () => {
        setIsExpanded(!isExpanded);
    };

    const status = detailedResult?.status;
    const finalSummary = detailedResult?.finalSummary;
    const error = detailedResult?.error;

    return (
        <View style={styles.resultItemContainer}>
            <View style={styles.resultHeader}>
                <ExternalLink style={styles.resultTitle} href={initialResult.url}>{initialResult.name}</ExternalLink>
                {!isTopN && !detailedResult && ( // Show indicator only if not top N AND not yet processed
                     <Chip icon="information" style={styles.indicatorChip} textStyle={styles.indicatorChipText}>Bing summary</Chip>
                )}
            </View>
            <ExternalLink style={styles.resultUrl} href={initialResult.url}>{initialResult.url}</ExternalLink>

            <View style={styles.summaryContainer}>
                {/* Loading Indicator */}
                {(status === 'partial_loading' || status === 'summary_loading') && (
                    <LoadingIndicator />
                )}

                {/* Final Summary (Loaded) */}
                {status === 'loaded' && finalSummary && (
                    <>
                        {/* Final Summary Text (potentially truncated) */}
                        <ThemedText style={styles.resultContent} numberOfLines={isTopN && !isExpanded ? 5 : undefined}>
                            {finalSummary}
                        </ThemedText>

                        {/* Partial Summary (shown when expanded) - Wrap with Animated.View */}
                        {isExpanded && detailedResult?.partialSummary && (
                             <Animated.View
                                style={styles.partialSummarySection}
                                entering={FadeIn.duration(250)}
                                exiting={FadeOut.duration(250)}
                             >
                                <Text style={styles.partialSummaryTitle}>Detailed Summary:</Text>
                                <ThemedText style={[styles.resultContent, styles.partialSummaryText]}>
                                    {detailedResult.partialSummary}
                                </ThemedText>
                             </Animated.View>
                        )}

                        {/* Show expand/collapse button for ANY item with a final summary */}
                        {finalSummary && ( // Only check if finalSummary exists
                            <Button
                                mode="contained-tonal" // Match Generate Summary style
                                onPress={handleExpandClick}
                                style={styles.actionButton}
                                labelStyle={styles.actionButtonLabel}
                                icon={isExpanded ? 'chevron-up' : 'chevron-down'} // Add conditional icon
                            >
                                {isExpanded ? 'Show Less' : 'Show More'}
                            </Button>
                        )}
                    </>
                )}

                {/* Error Message */}
                {(status === 'partial_error' || status === 'summary_error') && (
                    <ThemedText style={[styles.resultContent, styles.errorText]}>
                        Error: {error || 'Failed to load summary.'}
                    </ThemedText>
                )}

                {/* Placeholder for Loaded but Empty Summary */}
                {status === 'loaded' && !finalSummary && (
                     <ThemedText style={[styles.resultContent, styles.placeholderText]}>
                        Could not generate summary for this page.
                    </ThemedText>
                 )}

                 {/* Initial State: Show Snippet or Generate Button */}
                 {!status || status === 'pending' ? ( // If no detailed result or it's pending
                    <>
                        <ThemedText style={[styles.resultContent, styles.snippetText]}>
                            {initialResult.snippet}
                        </ThemedText>
                        {!isTopN && ( // Show generate button only for non-top-N items
                            <Button
                                mode="contained-tonal" // Or "outlined" or "text"
                                onPress={handleGenerateClick}
                                style={styles.actionButton}
                                labelStyle={styles.actionButtonLabel}
                                icon="text-box-search-outline" // Example icon
                            >
                                Generate Summary
                            </Button>
                        )}
                    </>
                 ) : null}
            </View>
        </View>
    );
});

// --- Main Search Screen Component ---
export default function SearchScreen() {
    const backgroundColor = useThemeColor({}, 'background');
    const tintColor = useThemeColor({}, 'tint') || "lightblue"; // Use 'tint' for the accent color
    const params = useLocalSearchParams<{ q: string }>();
    const query = params.q;
    const topN = 3; // Define how many results to process automatically

    const [initialResults, setInitialResults] = useState<InitialResult[]>([]); // Use specific type
    const [detailedResults, setDetailedResults] = useState<DetailedResult[]>([]);
    const [generalSummary, setGeneralSummary] = useState<string | null>(null);
    const [generalSummaryStatus, setGeneralSummaryStatus] = useState<GeneralSummaryStatus>('pending');

    const scrollRef = useAnimatedRef<Animated.ScrollView>();
    const generalSummaryFetchTriggered = useRef(false);

    // --- Effect 1: Fetch initial search results ---
    useEffect(() => {
        if (!query) return;

        setInitialResults([]);
        setDetailedResults([]);
        setGeneralSummary(null);
        setGeneralSummaryStatus('pending');
        generalSummaryFetchTriggered.current = false;

        const headers: HeadersInit = {};
        if (apiKey) headers['x-api-key'] = apiKey;
        else if (Platform.OS !== 'web') console.warn('API Key missing.');

        console.log(`Fetching initial results for query: ${query}`);
        setGeneralSummaryStatus('loading'); // Set loading state immediately
        fetch(`${backendUrl}/search?${new URLSearchParams({ q: query })}`, { headers })
            .then(res => {
                if (!res.ok) {
                     setGeneralSummaryStatus('error'); // Set error if fetch fails
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
                    id: r.id,
                    name: r.name,
                    url: r.url,
                    snippet: r.snippet,
                    status: 'pending',
                    partialSummary: null,
                    finalSummary: null,
                })));
            })
            .catch(e => {
                console.error('Error fetching initial search results:', e);
                setGeneralSummaryStatus('error'); // Indicate overall error if search fails
            });
    }, [query, topN]);

    // --- Function to trigger summary generation for a specific item ---
    const handleGenerateSummary = useCallback((id: string) => {
        // Check if already processing/processed
        if (detailedResults.some(dr => dr.id === id)) {
            console.log(`Summary generation already initiated or completed for ${id}`);
            return;
        }

        const resultToAdd = initialResults.find(ir => ir.id === id);
        if (resultToAdd) {
            console.log(`Adding result ${id} to detailed processing queue.`);
            setDetailedResults(prev => [
                ...prev,
                {
                    id: resultToAdd.id,
                    name: resultToAdd.name,
                    url: resultToAdd.url,
                    snippet: resultToAdd.snippet,
                    status: 'pending', // Start processing
                    partialSummary: null,
                    finalSummary: null,
                }
            ]);
        }
    }, [initialResults, detailedResults]); // Dependencies for the callback

    // --- Effect 2: Process individual URLs present in detailedResults ---
    useEffect(() => {
        if (!query || detailedResults.length === 0) return;

        // Find results that are 'pending' and process them
        const pendingResults = detailedResults.filter(r => r.status === 'pending');

        if (pendingResults.length === 0) return; // No pending results to process

        // --- Early spinner logic removed, handled in Effect 1 ---


        pendingResults.forEach((result) => {
            console.log(`Processing URL: ${result.url}`);
            // Update status to 'partial_loading' immediately for this specific item
            setDetailedResults(prev => prev.map(item =>
                item.id === result.id ? { ...item, status: 'partial_loading' } : item
            ));

            const commonPostHeaders: HeadersInit = { 'Content-Type': 'application/json' };
            if (apiKey) commonPostHeaders['x-api-key'] = apiKey;

            // --- Fetch Partial Summary ---
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
                        item.id === result.id ? { ...item, status: 'partial_error', error: partialError || 'Failed to load content' } : item
                    ));
                    return;
                }

                console.log(`Partial summary received for ${result.url}, fetching final summary...`);
                setDetailedResults(prev => prev.map(item =>
                    item.id === result.id ? { ...item, status: 'summary_loading', partialSummary: partialSummary } : item
                ));

                // --- Fetch Final Webpage Summary ---
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
                        item.id === result.id ? {
                            ...item,
                            status: 'loaded',
                            finalSummary: summaryData.webpageSummary
                        } : item
                    ));
                })
                .catch(e => {
                    console.error(`Error fetching final webpage summary for ${result.url}:`, e);
                    setDetailedResults(prev => prev.map(item =>
                        item.id === result.id ? { ...item, status: 'summary_error', error: e.message } : item
                    ));
                });
            })
            .catch(e => {
                console.error(`Error fetching partial summary for ${result.url}:`, e);
                setDetailedResults(prev => prev.map(item =>
                    item.id === result.id ? { ...item, status: 'partial_error', error: e.message } : item
                ));
            });
        });
    }, [query, detailedResults, generalSummaryStatus, topN]); // Rerun when query or detailedResults changes

    // --- Effect 3: Generate GENERAL summary ---
    useEffect(() => {
        // Only trigger if query exists, we have detailed results, and haven't triggered yet
        if (!query || detailedResults.length === 0 || generalSummaryFetchTriggered.current) {
            return;
        }

        // Check if all *initial top N* results have finished processing (success or fail)
        const initialTopNIds = initialResults.slice(0, topN).map(r => r.id);
        const topNProcessed = detailedResults
            .filter(dr => initialTopNIds.includes(dr.id)) // Only consider top N results
            .every(r => r.status !== 'pending' && r.status !== 'partial_loading' && r.status !== 'summary_loading');


        if (topNProcessed && initialTopNIds.length > 0) { // Ensure topN is > 0
             // Check if general summary status is still 'pending' or 'loading'
             // It might have been set to 'error' earlier if the initial search failed
             if (generalSummaryStatus === 'pending' || generalSummaryStatus === 'loading') {
                console.log('Top N results processed, triggering general summary generation.');
                generalSummaryFetchTriggered.current = true;
                setGeneralSummaryStatus('loading'); // Ensure it's loading now

                // Collect partial summaries ONLY from the initial top N results that succeeded partially
                const topNPartialSummaries = detailedResults
                    .filter(dr => initialTopNIds.includes(dr.id))
                    .map(r => (r.status === 'summary_loading' || r.status === 'loaded' || r.status === 'summary_error') ? r.partialSummary : null); // Include partial even if final failed

                const postHeaders: HeadersInit = { 'Content-Type': 'application/json' };
                if (apiKey) postHeaders['x-api-key'] = apiKey;

                fetch(`${backendUrl}/generate-general-summary`, {
                    method: 'POST',
                    headers: postHeaders,
                    body: JSON.stringify({ query: query, partialSummaries: topNPartialSummaries }),
                })
                .then(res => {
                    if (!res.ok) throw new Error(`General Summary API failed (${res.status})`);
                    return res.json();
                })
                .then(data => {
                    console.log('General summary received.');
                    setGeneralSummary(data.generalSummary);
                    setGeneralSummaryStatus('loaded');
                })
                .catch(e => {
                    console.error('Error generating general summary:', e);
                    setGeneralSummary('Error generating general summary.');
                    setGeneralSummaryStatus('error');
                });
            } else {
                 console.log("General summary generation skipped as status is already 'loaded' or 'error'.");
                 generalSummaryFetchTriggered.current = true; // Still mark as triggered to prevent re-attempts
            }
        }
    }, [query, initialResults, detailedResults, generalSummaryStatus, topN]); // Dependencies

    // --- Render Logic ---
    if (!query) {
        return <Redirect href='/' />;
    }

    const isLoadingInitial = initialResults.length === 0 && generalSummaryStatus === 'pending'; // Loading initial /search

    return (
        <Animated.ScrollView
            style={[{ backgroundColor }, styles.container]}
            ref={scrollRef}
            scrollEventThrottle={16}
        >
            <SearchBar value={query} />
            {/* General summary */}
            <ResultContainer
                title="General Summary"
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
                 {generalSummaryStatus === 'loading' && (
                     <LoadingIndicator />
                 )}
            </ResultContainer>

            <ResultContainer
                title="Results"
                loaded={initialResults.length > 0 || generalSummaryStatus === 'error'} // Show container once initial results arrive or if search failed
                loading={!initialResults.length}
            >
                {initialResults.map((initialRes, index) => {
                    const detailedRes = detailedResults.find(dr => dr.id === initialRes.id);
                    const isTopNItem = index < topN;
                    return (
                        <SearchResultItem
                            key={initialRes.id}
                            initialResult={initialRes}
                            detailedResult={detailedRes}
                            isTopN={isTopNItem}
                            onGenerateSummary={handleGenerateSummary}
                            indicatorColor={tintColor} // Pass tint color down
                        />
                    );
                })}
                {/* Show message if initial search returned no results AND wasn't an error */}
                {!isLoadingInitial && initialResults.length === 0 && generalSummaryStatus !== 'error' && (
                    <ThemedText>No results found for "{query}".</ThemedText>
                )}
                 {/* Show message if initial search itself failed */}
                 {generalSummaryStatus === 'error' && initialResults.length === 0 && (
                     <ThemedText style={styles.errorText}>Failed to fetch search results.</ThemedText>
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
        marginBottom: 25, // Increased space between result items
        paddingBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
     resultHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 2,
    },
    resultTitle: {
        color: '#0000EE',
        textDecorationLine: 'underline',
        fontSize: 18,
        flexShrink: 1, // Allow title to shrink if needed
        marginRight: 8, // Space between title and chip
        // alignSelf: "flex-start", // Removed, handled by resultHeader
    },
    indicatorChip: {
        // Style the chip indicator
        height: 24,
        alignItems: 'center',
    },
    indicatorChipText: {
        fontSize: 10, // Smaller text for the chip
    },
    resultUrl: {
        fontSize: 12,
        color: '#555555',
        alignSelf: "flex-start",
        marginBottom: 8, // Increased margin
    },
    summaryContainer: {
        marginTop: 8, // Increased margin
        minHeight: 40, // Ensure space for loading indicator or button
    },
    resultContent: {
        fontSize: 14,
        lineHeight: 20, // Improve readability
    },
    snippetText: {
        color: '#444', // Slightly darker than placeholder
        marginBottom: 10, // Space before generate button
    },
    // statusContainer style removed
    // loadingText style removed
    errorText: {
        color: 'red',
    },
    placeholderText: {
        color: '#888',
        fontStyle: 'italic',
    },
    partialSummarySection: { // Styles for the revealed partial summary
        marginTop: 10,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: '#eee',
    },
    partialSummaryTitle: { // Style for the "Detailed Summary:" label
        fontSize: 14,
        fontWeight: 'bold',
        color: '#666',
        marginBottom: 4,
    },
    partialSummaryText: { // Style for the partial summary text itself
        fontSize: 14,
        color: '#555',
        fontStyle: 'italic',
    },
    actionButton: {
        marginTop: 10, // Space above the button
        alignSelf: 'flex-start', // Align button to the left
    },
    actionButtonLabel: {
        fontSize: 13, // Slightly smaller button text
    }
});
