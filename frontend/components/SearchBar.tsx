import { useState } from "react";
import { View, StyleProp, StyleSheet, ViewStyle } from "react-native";
import { useRouter } from "expo-router";
import { Button, Searchbar } from "react-native-paper";

/**
 * Default direction: row
 * @returns
 */
const SearchBar = (props: {
  value?: string;
  style?: StyleProp<ViewStyle>;
  direction?: "row" | "column";
}) => {
  const [query, setQuery] = useState(props.value ?? "");
  const router = useRouter();

  const handleSearch = () => {
    if (query) {
      router.push({
        pathname: "/search",
        params: { q: query },
      });
    }
  };

  const viewStyle = StyleSheet.create({
    view: {
      flexDirection: props.direction ?? 'row',
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
    },
  }).view;

  return (
    <View style={viewStyle}>
      <Searchbar
        icon={require("../assets/images/search.svg")}
        clearIcon={require("../assets/images/close.svg")}
        style={styles.searchBar}
        value={query}
        onChangeText={setQuery}
        onSubmitEditing={handleSearch}
        clearButtonMode="always"
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
  searchBar: {
    marginVertical: 5,
    flex: 1
  },
  searchButton: {
    backgroundColor: "#E0E0E0",
    borderRadius: 20,
  },
  searchButtonContent: {
    height: 50,
    paddingHorizontal: 5,
  },
});

export default SearchBar;
