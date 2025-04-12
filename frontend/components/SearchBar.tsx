import { useState } from "react";
import { ThemedView } from "./ThemedView";
import { StyleProp, StyleSheet, ViewStyle } from "react-native";
import { ThemedText } from "./ThemedText";
import { Link } from "expo-router";
import { Searchbar } from "react-native-paper";

const SearchBar = (params: {value?: string, style?: StyleProp<ViewStyle>}) => {
  const [query, setQuery] = useState(params.value ?? '');
  return (
    <ThemedView style={params.style ?? styles.view}>
      <Searchbar icon="magnify" clearIcon="close" style={styles.searchBar} value={query} onChangeText={setQuery} />
      {query ? (
        <Link
          href={{
            pathname: "/search",
            params: { q: query },
          }}
          push
        >
          <ThemedText>Search</ThemedText>
        </Link>
      ) : (
        <ThemedText style={{ color: "grey" }}>Search</ThemedText>
      )}
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  view: {
    flexDirection: 'row',
    alignItems: "center",
    justifyContent: "center",
    gap: 10
  },
  searchBar: {
    flexGrow: 1
  }
});

export default SearchBar;
