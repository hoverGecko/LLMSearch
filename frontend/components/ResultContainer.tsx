import React, { PropsWithChildren } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { Text, Surface } from 'react-native-paper';

/**
 * Container with a title and React elements as content. 
 * If loaded is false, then show a loading spinner.
 * @param param0 
 * @returns 
 */
const ResultContainer = ({ title, children, loaded = true }: PropsWithChildren<{title: string, loaded: boolean}>) => {
  return (
    <Surface style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {loaded ? children : (
        <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" />
        </View>
      )}
    </Surface>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    padding: 16,
    margin: 8,
    elevation: 2, // Gives a slight shadow effect
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    margin: 10
  }
});

export default ResultContainer;