import React, { useState } from 'react';
import { StyleSheet, Alert, View } from 'react-native';
import { TextInput, Button, Text, Title, useTheme } from 'react-native-paper';
import { useRouter } from 'expo-router';
import BackButton from '@/components/BackButton';
import { useAuth } from '@/context/AuthContext';


export default function SignupScreen() {
  const theme = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { signup } = useAuth();

  const handleSignup = async () => {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      // Call the signup function from context with email and password
      await signup(email, password);

      // Signup successful, show message and navigate to login
      console.log('Signup successful from component');
      Alert.alert('Signup Successful', 'Your account has been created. Please log in.');
      router.replace('/login'); // Navigate to login screen

    } catch (err: any) {
      console.error('Error signing up:', err);
      const errorMessage = err.message || 'An error occurred during signup.';
      setError(errorMessage);
      Alert.alert('Signup Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.outerContainer, { backgroundColor: theme.colors.background }]}>
      <BackButton />
      <View style={[styles.innerContainer, { backgroundColor: theme.colors.background }]}>
        <Title style={styles.appTitle}>LLMSearch</Title>
        <Text variant="headlineMedium" style={styles.title}>Sign Up</Text>
        {error && <Text style={[styles.errorText, { color: theme.colors.error }]}>{error}</Text>}
        <TextInput
          label="Email"
          value={email}
          onChangeText={setEmail}
          mode="outlined"
          style={styles.input}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TextInput
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          mode="outlined"
          style={styles.input}
        />
        <Button
          mode="contained"
          onPress={handleSignup}
          loading={loading}
          disabled={loading}
          style={styles.button}
        >
          {loading ? 'Signing up...' : 'Sign Up'}
        </Button>
        <View style={styles.linkContainer}>
          <Text>Already have an account? </Text>
          <Button onPress={() => router.navigate("/login")}>Login</Button>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: "center"
  },
  innerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
    maxWidth: 500,
    width: '100%'
  },
  appTitle: {
    marginBottom: 30,
    fontSize: 32, 
  },
  title: {
    marginBottom: 20,
  },
  input: {
    width: "100%",
    marginBottom: 15,
  },
  button: {
    width: "100%",
    paddingVertical: 8,
    marginTop: 10,
  },
  linkContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 20
  },
  link: {
    marginLeft: 5,
    fontWeight: "bold"
  },
  errorText: {
    marginBottom: 15,
    textAlign: "center",
  },
});
