import { useState } from "react";
import { View, StyleProp, StyleSheet, ViewStyle } from "react-native";
import { useRouter } from "expo-router";
import { Button, Searchbar } from "react-native-paper";

const SearchBar = (params: {value?: string, style?: StyleProp<ViewStyle>}) => {
  const [query, setQuery] = useState(params.value ?? '');
  const router = useRouter();

  const handleSearch = () => {
    if (query) {
      router.push({
        pathname: "/search",
        params: { q: query },
      });
    }
  };

  return (
    <View style={params.style ?? styles.view}>
      <Searchbar 
        icon={require("../assets/images/search.svg")} 
        clearIcon={require("../assets/images/close.svg")} 
        style={styles.searchBar} 
        value={query} 
        onChangeText={setQuery}
        onSubmitEditing={handleSearch}
      />
      <Button
        mode="contained"
        onPress={handleSearch}
        style={styles.searchButton}
        contentStyle={styles.searchButtonContent}
        disabled={!query}
        textColor="black"
      >
        Search
      </Button>
    </View>
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
  },
  searchButton: {
    backgroundColor: '#E0E0E0',
    borderRadius: 20
  },
  searchButtonContent: {
    height: 50,
    paddingHorizontal: 5
  }
});

export default SearchBar;
