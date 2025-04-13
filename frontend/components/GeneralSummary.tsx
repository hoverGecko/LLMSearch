import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Platform } from 'react-native';
import { Text } from 'react-native-paper';
import ResultContainer from '@/components/ResultContainer';
import LoadingIndicator from '@/components/LoadingIndicator';
import { backendUrl, apiKey } from '@/constants/Constants';
import { InitialResult, DetailedResult } from './SearchResultItem'

type GeneralSummaryStatus = 'pending' | 'loading' | 'loaded' | 'error';

interface GeneralSummaryProps {
    query: string;
    initialResults: InitialResult[];
    detailedResults: DetailedResult[];
    topN: number;
}

const GeneralSummary: React.FC<GeneralSummaryProps> = ({
    query,
    initialResults,
    detailedResults,
    topN,
}) => {
    const [generalSummary, setGeneralSummary] = useState<string | null>(null);
    const [generalSummaryStatus, setGeneralSummaryStatus] = useState<GeneralSummaryStatus>('pending');
    const generalSummaryFetchTriggered = useRef(false);

    // Effect 1: Reset state when query changes
    useEffect(() => {
        console.log("Query changed, resetting general summary state.");
        setGeneralSummary(null);
        setGeneralSummaryStatus('pending');
        generalSummaryFetchTriggered.current = false;
    }, [query]);

    // Effect 2: Fetch GENERAL summary when conditions are met
    useEffect(() => {
        // Conditions to fetch: query exists, initial results are loaded, fetch not already triggered
        const shouldFetch = query && initialResults.length > 0 && !generalSummaryFetchTriggered.current;

        if (!shouldFetch) {
             // Handle initial loading state before initialResults arrive
             if (query && initialResults.length === 0 && generalSummaryStatus === 'pending') {
                 console.log("Initial results not yet loaded, setting general summary to loading.");
                 setGeneralSummaryStatus('loading');
             }
             // Handle case where initial search failed (indicated by detailedResults having errors)
             else if (query && initialResults.length === 0 && detailedResults.length > 0 && detailedResults.every(r => r.status === 'partial_error' || r.status === 'summary_error')) {
                 console.log("Initial search failed, setting general summary to error.");
                 setGeneralSummaryStatus('error');
                 setGeneralSummary('Failed to fetch initial results needed for summary.');
                 generalSummaryFetchTriggered.current = true; // Prevent further attempts
             }
            return; // Exit if conditions not met
        }

        // Check if all initial top N results have finished processing (success or fail)
        const initialTopNIds = initialResults.slice(0, topN).map(r => r.id);
        const topNProcessed = detailedResults
            .filter(dr => initialTopNIds.includes(dr.id)) // Only consider top N results
            .every(r => r.status !== 'pending' && r.status !== 'partial_loading' && r.status !== 'summary_loading');

        if (topNProcessed && initialTopNIds.length > 0) {
            // Fetch only if not already triggered
            if (!generalSummaryFetchTriggered.current) {
                console.log('Top N results processed, triggering general summary generation.');
                generalSummaryFetchTriggered.current = true; // Mark as triggered
                setGeneralSummaryStatus('loading'); // Set loading state *before* fetch

                // Collect partial summaries ONLY from the initial top N results that succeeded partially
                const topNPartialSummaries = detailedResults
                    .filter(dr => initialTopNIds.includes(dr.id))
                    .map(r => (r.status === 'summary_loading' || r.status === 'loaded' || r.status === 'summary_error') ? r.partialSummary : null); // Include partial even if final failed

                const postHeaders: HeadersInit = { 'Content-Type': 'application/json' };
                if (apiKey) postHeaders['x-api-key'] = apiKey;
                else if (Platform.OS !== 'web') console.warn('API Key missing for general summary.');


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
                 console.log("General summary generation already triggered or completed.");
            }
        } else if (generalSummaryStatus === 'pending') {
             // If topN haven't finished processing yet, but we have initial results, show loading
             // This check prevents resetting to loading if it was already set to error by Effect 1
             console.log("Top N not processed yet, setting general summary to loading.");
             setGeneralSummaryStatus('loading');
        }
    }, [query, initialResults, detailedResults, topN]);

    return (
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
    );
};

const styles = StyleSheet.create({
    resultContent: {
        fontSize: 14,
        lineHeight: 20,
    },
    errorText: {
        color: 'red',
    },
});

export default GeneralSummary;
