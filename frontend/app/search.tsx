import { StyleSheet, View } from 'react-native';
import { backendUrl } from '@/constants/Constants';

import { ThemedView } from '@/components/ThemedView';
import { Redirect, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ThemedText } from '@/components/ThemedText';
import SearchBar from '@/components/SearchBar';
import Animated, { useAnimatedRef } from 'react-native-reanimated';
import { useThemeColor } from '@/hooks/useThemeColor';
import { ExternalLink } from '@/components/ExternalLink';
    
const SearchResult = (params: {result: {name: string, url: string, snippet: string}}) => {
    const result = params.result;
    return (
        <View>
          <ExternalLink 
            style={styles.resultTitle} 
            href={result.url}
          >
            {result.name}
          </ExternalLink>
          <ExternalLink 
            style={styles.resultUrl} 
            href={result.url}
          >
              {result.url}
          </ExternalLink>
          <ThemedText 
            style={styles.resultContent} 
            numberOfLines={3}
          >
            {result.snippet}
          </ThemedText>
        </View>
    );
}

export default function SearchScreen() {
  const backgroundColor = useThemeColor({}, 'background');

  const params = useLocalSearchParams<{q: string}>();
  const [bingApiResult, setBingApiResult] = useState<any>();
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  useEffect(() => {
    if (!params.q) {
        return;
    }
    fetch(`${backendUrl}/search?${new URLSearchParams({q: params.q})}`)
    .then(res => res.json())
    .then(text => setBingApiResult(text))
    .catch(e => {
      console.error(e);
    });
  }, [params.q]);
  if (!params.q) {
    return <Redirect href='/' />;
  }
  const results = bingApiResult?.webPages?.value;
  return (
      <Animated.ScrollView 
        style={[{backgroundColor}, styles.container]} 
        ref={scrollRef} 
        scrollEventThrottle={16}
      >
          <SearchBar value={params.q} />
          <ThemedView style={styles.results}>
              {results?.map((r: any) => <SearchResult key={r.id} result={r} />)}
          </ThemedView>
      </Animated.ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20
  },
  headerImage: {
    color: '#808080',
    bottom: -90,
    left: -35,
    position: 'absolute',
  },
  titleContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  results: {
    gap: 20,
    marginTop: 20
  },
  resultTitle: {
    color: '#0000EE',
    textDecorationLine: 'underline',
    fontSize: 18,
    alignSelf: "flex-start"
  },
  resultUrl: {
    fontSize: 12,
    color: '#555555',
    alignSelf: "flex-start"
  },
  resultContent: {
    fontSize: 14
  }
});
