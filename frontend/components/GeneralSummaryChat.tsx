import SendIcon from '@/assets/images/send.svg';
import LoadingIndicator from '@/components/LoadingIndicator';
import ResultContainer from '@/components/ResultContainer';
import { useAuth } from '@/context/AuthContext';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Button, Text } from 'react-native-paper';
import { DetailedResult, InitialResult } from './SearchResultItem';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | null;
}

type GeneralSummaryStatus = 'pending' | 'loading' | 'loaded' | 'error';

interface GeneralSummaryProps {
    query: string;
    initialResults: InitialResult[];
    detailedResults: DetailedResult[];
    topN: number;
    onSuggestionClick: (suggestion: string) => void;
}

const GeneralSummaryChat: React.FC<GeneralSummaryProps> = ({
    query,
    initialResults,
    detailedResults,
    topN,
    onSuggestionClick,
}) => {
    const [generalSummary, setGeneralSummary] = useState<string | null>(null);
    const [generalSummaryStatus, setGeneralSummaryStatus] = useState<GeneralSummaryStatus>('pending');
    const generalSummaryFetchTriggered = useRef(false); // ref does not rerender component when changed
    const [chatHistory, setChatHistory] = useState<ChatMessage[] | null>(null);
    const [userQuery, setUserQuery] = useState<string>('');
    const [isChatLoading, setIsChatLoading] = useState<boolean>(false);
    const [chatError, setChatError] = useState<string | null>(null);
    const [suggestedQueries, setSuggestedQueries] = useState<string[]>([]);
    const chatScrollViewRef = useRef<ScrollView>(null);
    const { authFetch } = useAuth();

    // Reset when query is changed
    useEffect(() => {
        console.log("Query changed, resetting general summary and chat state.");
        setGeneralSummary(null);
        setGeneralSummaryStatus('pending');
        generalSummaryFetchTriggered.current = false;
        setChatHistory(null);
        setUserQuery('');
        setIsChatLoading(false);
        setChatError(null);
        setSuggestedQueries([]); // Reset suggestions on query change
    }, [query]);

    // Fetch general summary when conditions are met
    useEffect(() => {
        const shouldFetch = query && initialResults.length > 0 && !generalSummaryFetchTriggered.current;

        if (!shouldFetch) {
             if (query && initialResults.length === 0 && generalSummaryStatus === 'pending') {
                 console.log("Initial results not yet loaded, setting general summary to loading.");
                 setGeneralSummaryStatus('loading');
             }
             else if (query && initialResults.length === 0 && detailedResults.length > 0 && 
                detailedResults.every(r => r.status === 'partial_error' || r.status === 'summary_error')) {
                 console.log("Initial search failed, setting general summary to error.");
                 setGeneralSummaryStatus('error');
                 setGeneralSummary('Failed to fetch initial results needed for summary.');
                 generalSummaryFetchTriggered.current = true;
             }
            return;
        }

        // Check if all initial top N results have finished processing (success or fail)
        const initialTopNIds = initialResults.slice(0, topN).map(r => r.id);
        const topNProcessed = detailedResults
            .filter(dr => initialTopNIds.includes(dr.id))  // Only consider top N results
            .every(r => r.status !== 'pending' && r.status !== 'partial_loading' && r.status !== 'summary_loading');

        if (topNProcessed && initialTopNIds.length > 0) {
            // Fetch only if not already triggered
            if (!generalSummaryFetchTriggered.current) {
                console.log('Top N results processed, triggering general summary generation.');
                generalSummaryFetchTriggered.current = true; // Mark as triggered
                setGeneralSummaryStatus('loading'); // Set loading state before fetch

                // Collect partial summaries from the initial top N results that succeeded partially
                const topNPartialSummaries = detailedResults
                    .filter(dr => initialTopNIds.includes(dr.id))
                    .map(r => (
                        r.status === 'summary_loading' || 
                        r.status === 'loaded' || 
                        r.status === 'summary_error'
                    ) ? r.partialSummary : null);

                authFetch('generate-general-summary', {
                    method: 'POST',
                    body: JSON.stringify({ query: query, partialSummaries: topNPartialSummaries }),
                })
                .then(res => {
                    if (!res.ok) throw new Error(`General Summary API failed (${res.status})`);
                    return res.json();
                })
                .then(data => {
                    console.log('General summary and initial chat history received.');
                    setGeneralSummary(data.generalSummary);
                    if (data.initialChatHistory && Array.isArray(data.initialChatHistory)) {
                        setChatHistory(data.initialChatHistory);
                    } else {
                        console.warn("Initial chat history missing or invalid in response.");
                        setChatHistory([{ role: 'assistant', content: data.generalSummary || "Summary loaded." }]);
                    }
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
             console.log("Top N not processed yet, setting general summary to loading.");
             setGeneralSummaryStatus('loading');
        }
    }, [query, initialResults, detailedResults, topN, generalSummaryStatus]);

    const handleChatSubmit = useCallback(async () => {
        if (!userQuery.trim() || isChatLoading || !chatHistory) {
            return;
        }

        const currentQuery = userQuery.trim();
        setIsChatLoading(true);
        setChatError(null);
        setUserQuery('');

        const newUserMessage: ChatMessage = { role: 'user', content: currentQuery };
        const optimisticHistory = [...chatHistory, newUserMessage];
        setChatHistory(optimisticHistory);

        setTimeout(() => chatScrollViewRef.current?.scrollToEnd({ animated: true }), 100);

        try {
            const response = await authFetch('chat', {
                method: 'POST',
                body: JSON.stringify({ history: chatHistory, query: currentQuery }),
            });

            if (!response.ok) {
                throw new Error(`Chat API failed (${response.status})`);
            }

            const data = await response.json();
            console.log('Chat response received:', data);

            // Handle new response structure
            if (data.history && Array.isArray(data.history)) {
                setChatHistory(data.history);
                // Store suggestions if they exist
                setSuggestedQueries(data.suggestedQueries && Array.isArray(data.suggestedQueries) ? data.suggestedQueries : []);
                setTimeout(() => chatScrollViewRef.current?.scrollToEnd({ animated: true }), 100);
            } else {
                throw new Error("Invalid chat response format received from backend.");
            }

        } catch (e: any) {
            console.error('Error processing chat request:', e);
            setSuggestedQueries([]); // Clear suggestions on error
            setChatError(e.message || 'Failed to get chat response.');
        } finally {
            setIsChatLoading(false);
        }
    }, [userQuery, isChatLoading, chatHistory]);

     useEffect(() => {
        if (chatHistory && chatHistory.length > 0) {
             setTimeout(() => chatScrollViewRef.current?.scrollToEnd({ animated: true }), 100);
        }
    }, [chatHistory]);


    return (
        <ResultContainer
            title="General Summary & Chat"
            loaded={generalSummaryStatus === 'loaded' && !!generalSummary}
            loading={generalSummaryStatus === 'loading' && !generalSummary}
            error={generalSummaryStatus === 'error'}
        >
            {generalSummaryStatus === 'loading' && !generalSummary && (
                <LoadingIndicator />
            )}

            {generalSummaryStatus === 'loaded' && chatHistory && (
                <View style={styles.chatContainer}>
                    <ScrollView
                        ref={chatScrollViewRef}
                        style={styles.chatHistory}
                        contentContainerStyle={styles.chatHistoryContent}
                        nestedScrollEnabled={true}
                    >
                        {chatHistory
                            .filter(msg => msg.role !== 'system')
                            .map((message, index) => (
                                <View
                                    key={index}
                                    style={[
                                        styles.chatMessage,
                                        message.role === 'user' ? styles.userMessage : styles.assistantMessage,
                                    ]}
                                >
                                    <Text style={message.role === 'user' ? styles.userMessageText : styles.assistantMessageText}>
                                        {message.content}
                                    </Text>
                                </View>
                             ))}
                         {isChatLoading && (
                             <View style={styles.assistantMessage}>
                                 <LoadingIndicator />
                             </View>
                         )}
                         {chatError && (
                             <Text style={styles.errorText}>{chatError}</Text>
                         )}
                    </ScrollView>

                    {suggestedQueries.length > 0 && (
                        <View style={styles.suggestionsContainer}>
                            <Text style={styles.suggestionsTitle}>Suggested searches:</Text>
                            {suggestedQueries.map((suggestion, index) => (
                                <Button
                                    key={index}
                                    mode="outlined"
                                    onPress={() => onSuggestionClick(suggestion)}
                                    style={styles.suggestionButton}
                                    labelStyle={styles.suggestionButtonLabel}
                                >
                                    {suggestion}
                                </Button>
                            ))}
                        </View>
                    )}

                    <View style={styles.chatInputContainer}>
                        <TextInput
                            style={styles.chatInput}
                            value={userQuery}
                            onChangeText={setUserQuery}
                            placeholder="Ask a follow-up question..."
                            editable={!isChatLoading}
                            onSubmitEditing={handleChatSubmit}
                            blurOnSubmit={false}
                        />
                        <Button
                            onPress={handleChatSubmit}
                            disabled={isChatLoading || !userQuery.trim()}
                            icon={SendIcon}
                        >Send</Button>
                    </View>
                </View>
            )}
        </ResultContainer>
    );
};

const styles = StyleSheet.create({
    resultContent: {
        fontSize: 14,
        lineHeight: 20,
        marginBottom: 15,
    },
    errorText: {
        color: 'red',
    },
    chatContainer: {
        marginTop: 10,
        borderTopWidth: 1,
        borderTopColor: '#eee',
        paddingTop: 10,
        minHeight: 200,
        maxHeight: 400,
        flex: 1
    },
    chatHistory: {
        marginBottom: 10
    },
    chatHistoryContent: {
        paddingBottom: 10,
    },
    chatMessage: {
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 15,
        marginBottom: 8,
        maxWidth: '85%',
    },
    userMessage: {
        backgroundColor: '#007bff',
        alignSelf: 'flex-end',
        marginLeft: '15%',
    },
    assistantMessage: {
        backgroundColor: '#e9e9eb',
        alignSelf: 'flex-start',
        marginRight: '15%',
    },
     userMessageText: {
        color: '#ffffff',
    },
    assistantMessageText: {
        color: '#101010',
    },
    suggestionsContainer: {
        marginTop: 10,
        marginBottom: 5,
        paddingTop: 5,
        borderTopWidth: 1,
        borderTopColor: '#eee',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        overflow: 'scroll'
    },
    suggestionsTitle: {
        fontSize: 13,
        fontWeight: 'bold',
        marginBottom: 5,
        color: '#666',
    },
    suggestionButton: {
        marginBottom: 5,
        borderColor: '#ccc', // Lighter border for suggestions
    },
    suggestionButtonLabel: {
        fontSize: 13,
        color: '#333', // Darker text for suggestions
    },
    chatInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: '#eee',
        paddingTop: 10,
    },
    chatInput: {
        flex: 1,
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 20,
        paddingHorizontal: 15,
        paddingVertical: Platform.OS === 'ios' ? 10 : 5,
        marginRight: 10,
        backgroundColor: '#fff',
    },
});

export default GeneralSummaryChat;
