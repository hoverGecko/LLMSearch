import React, { PropsWithChildren } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Surface } from 'react-native-paper';
import LoadingIndicator from './LoadingIndicator';

/**
 * Container with a title and React elements as content. 
 * Displays content based on loading, error, and loaded states.
 * - Shows loading indicator if `loading` is true.
 * - Shows error message if `error` is true.
 * - Shows children if `loaded` is true (and not loading or error).
 * @param param0 Props including title, children, and state flags.
 * @returns The container component.
 */
const ResultContainer = ({
    title,
    children,
    loaded = false,
    loading = false,
    error = false
}: PropsWithChildren<{ title?: string; loaded?: boolean; loading?: boolean; error?: boolean }>) => {
    return (
        <Surface style={styles.container}>
            {title && <Text style={styles.title}>{title}</Text>}
            {loading ? (
                <View style={styles.statusContainer}>
                    <LoadingIndicator />
                </View>
            ) : error ? (
                <View style={styles.statusContainer}>
                    {/* If no children, display default error message. */}
                    {React.Children.count(children) > 0 ? children : <Text style={styles.errorText}>An error occurred.</Text>}
                </View>
            ) : loaded ? (
                 children
            ) : (
                 null
            )}
        </Surface>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#fafafa',
        borderRadius: 10,
        padding: 16,
        marginVertical: 8, // Use vertical margin
        elevation: 2, // Gives a slight shadow effect
        minHeight: 80, // Ensure minimum height for status indicators
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 12, // Increased margin
    },
    statusContainer: { // Renamed from loadingContainer
        flex: 1, // Take remaining space
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: 50, // Ensure space for indicator/text
    },
    errorText: {
        color: 'red',
        fontSize: 14,
    }
});

export default ResultContainer;
