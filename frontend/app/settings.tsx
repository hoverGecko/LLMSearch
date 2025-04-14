import React from 'react';
import { StyleSheet, View, Alert } from 'react-native';
import { Button, Title, useTheme } from 'react-native-paper'; // Import IconButton
import { useRouter } from 'expo-router';
import { signOut } from '@aws-amplify/auth';
import BackButton from '@/components/BackButton';

export default function SettingsScreen() {
  const theme = useTheme();
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      await signOut();
      console.log('Sign out successful from Settings');
    } catch (error) {
      console.error('Error signing out from Settings: ', error);
      Alert.alert('Sign Out Error', (error as Error).message || 'An unexpected error occurred.');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <BackButton />
      <Title style={styles.title}>Settings</Title>
      <Button
        mode="contained"
        onPress={handleSignOut}
        style={styles.button}
      >
        Sign Out
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 30,
    alignItems: 'center',
    position: 'relative'
  },
  closeButton: {
    position: 'absolute',
    top: 15,
    right: 15,
    zIndex: 1,
  },
  title: {
    marginBottom: 30,
    alignSelf: 'flex-start', 
  },
  button: {
    width: '100%',
    paddingVertical: 8,
    marginTop: 20,
  },
});
