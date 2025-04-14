import React, { useState } from 'react';
import { StyleSheet, Alert, View } from 'react-native';
import { TextInput, Button, Text, Title, useTheme } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { signUp } from '@aws-amplify/auth';
import BackButton from '@/components/BackButton';

export default function SignupScreen() {
  const theme = useTheme(); // Access Paper theme
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSignup = async () => {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const { nextStep } = await signUp({
        username: email,
        password,
        options: {
          userAttributes: {
            email, // Cognito requires email attribute if using email as username
          },
          // autoSignIn: true // Optional: Automatically sign in after confirmation
        }
      });

      console.log('Signup next step:', nextStep);

      if (nextStep.signUpStep === 'CONFIRM_SIGN_UP') {
        // Navigate to a confirmation screen or show instructions
        Alert.alert('Check your email', 'A confirmation code has been sent to your email.');
        // Optionally navigate to a confirmation code input screen
        // router.push({ pathname: '/confirm-signup', params: { email } });
        router.replace({ pathname: '/login' }); // Use object format
      } else if (nextStep.signUpStep === 'DONE') {
        // This happens if autoSignIn is true and successful
        console.log('Signup complete and auto signed in');
        // Hub listener in _layout should handle navigation
      }

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
          mode="outlined" // Paper TextInput mode
          style={styles.input}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TextInput
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          mode="outlined" // Paper TextInput mode
          style={styles.input}
        />
        <Button
          mode="contained" // Paper Button mode
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
