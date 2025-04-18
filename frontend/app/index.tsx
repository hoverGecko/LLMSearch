import SettingsIcon from '@/assets/images/settings.svg';
import SearchBar from '@/components/SearchBar';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Link, useRouter } from 'expo-router';
import { StyleSheet } from 'react-native';
import { IconButton } from 'react-native-paper';

export default function HomeScreen() {
  const router = useRouter();
  return (
    <ThemedView style={styles.outerContainer}>
      <IconButton
        icon={SettingsIcon}
        size={28}
        style={styles.settingsButton}
        onPress={() => {router.navigate('/settings')}}
      />
      <ThemedView style={styles.innerContainer}>
        <ThemedView style={styles.titleContainer}>
          <Link href="/">
            <ThemedText type="title">LLMSearch</ThemedText>
          </Link>
        </ThemedView>
        <SearchBar direction="column" />
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
    position: 'relative',
    width: '100%'
  },
  innerContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
    position: 'relative',
    width: '80%'
  },
  settingsButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    padding: 5,
    zIndex: 1
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
