import React, { useState, memo } from 'react';
import { StyleSheet, View, Platform } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ExternalLink } from '@/components/ExternalLink';
import LoadingIndicator from '@/components/LoadingIndicator';
import { Text, Button, Chip } from 'react-native-paper';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';


// Define types for better state management
// pending: Initial state
// partial_loading: Fetching partial summary from /process-url
// partial_error: Error fetching partial summary
// summary_loading: Fetching final webpage summary from /generate-webpage-summary
// loaded: Final webpage summary loaded successfully
// summary_error: Error fetching final webpage summary
export type ResultStatus = 'pending' | 'partial_loading' | 'partial_error' | 'summary_loading' | 'loaded' | 'summary_error';

const arrowUpIcon = require("@/assets/images/arrow_up.svg");
const arrowDownIcon = require("@/assets/images/arrow_down.svg");
const autoRenewIcon = require("@/assets/images/auto_renew.svg");
const infoIcon = require("@/assets/images/info.svg");

export interface DetailedResult {
    id: string;
    name: string;
    url: string;
    snippet?: string; // Initial Bing Summary
    status: ResultStatus;
    partialSummary: string | null;
    webpageSummary: string | null;
    error?: string;
}

// Interface for the initial Bing result structure
export interface InitialResult {
    id: string;
    name: string;
    url: string;
    snippet: string;
}

const SearchResultItem = memo((params: {
    initialResult: InitialResult;
    detailedResult: DetailedResult | undefined;
    isTopN: boolean;
    onGenerateSummary: (url: string) => void;
    indicatorColor: string;
}) => {
    const { initialResult, detailedResult, isTopN, onGenerateSummary, indicatorColor } = params;
    const [isExpanded, setIsExpanded] = useState(false);

    const handleGenerateClick = () => {
        onGenerateSummary(initialResult.url);
    };

    const handleExpandClick = () => {
        setIsExpanded(!isExpanded);
    };

    const status = detailedResult?.status;
    const webpageSummary = detailedResult?.webpageSummary;
    const error = detailedResult?.error;

    return (
        <View style={styles.resultItemContainer}>
            <View style={styles.resultHeader}>
                <ExternalLink style={styles.resultTitle} href={initialResult.url}>{initialResult.name}</ExternalLink>
                {!isTopN && !detailedResult && ( // Show indicator only if not top N AND not yet processed
                     <Chip icon={infoIcon} style={styles.indicatorChip} textStyle={styles.indicatorChipText}>Bing summary</Chip>
                )}
            </View>
            <ExternalLink style={styles.resultUrl} href={initialResult.url}>{initialResult.url}</ExternalLink>

            <View style={styles.summaryContainer}>
                {/* Loading Indicator */}
                {(status === 'partial_loading' || status === 'summary_loading') && (
                    <LoadingIndicator />
                )}

                {/* Webpage Summary (Loaded) */}
                {status === 'loaded' && webpageSummary && (
                    <>
                        {/* Final Summary Text (potentially truncated) */}
                        <ThemedText style={styles.resultContent} numberOfLines={isTopN && !isExpanded ? 5 : undefined}>
                            {webpageSummary}
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

                        {/* Show expand/collapse button for items with a webpage summary */}
                        {webpageSummary && (
                            <Button
                                mode="contained-tonal"
                                onPress={handleExpandClick}
                                style={styles.actionButton}
                                labelStyle={styles.actionButtonLabel}
                                icon={isExpanded ? arrowUpIcon : arrowDownIcon}
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
                {status === 'loaded' && !webpageSummary && (
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
                                mode="contained-tonal"
                                onPress={handleGenerateClick}
                                style={styles.actionButton}
                                labelStyle={styles.actionButtonLabel}
                                icon={autoRenewIcon}
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

export default SearchResultItem;

const styles = StyleSheet.create({
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
    },
    indicatorChip: {
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
