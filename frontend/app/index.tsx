import { StyleSheet } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import SearchBar from '@/components/SearchBar';
import { useRouter } from 'expo-router';
import { IconButton } from 'react-native-paper';

export default function HomeScreen() {
  const router = useRouter();
  return (
    <ThemedView style={styles.container}>
      {/* Settings Icon Button */}
      <IconButton
        icon={require("../assets/images/settings.svg")}
        size={28}
        style={styles.settingsButton}
        onPress={() => {router.navigate('/settings')}}
      />
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">LLMSearch</ThemedText>
      </ThemedView>
      <SearchBar />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    // Keep existing styles, just add settings button style
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
    gap: 10,
    position: 'relative', // Needed for absolute positioning of button
  },
  settingsButton: {
    position: 'absolute',
    top: 20, // Adjust as needed for status bar height
    right: 20,
    padding: 5, // Add padding for easier touch
  },
  searchBar: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    margin: 20
  },
  stepContainer: {
    gap: 8,
    marginBottom: 8,
  },
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: 'absolute',
  },
});
