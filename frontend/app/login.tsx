import React, { useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { signIn } from "@aws-amplify/auth";
import { useRouter } from "expo-router";
import { Button, Text, TextInput, Title, useTheme } from "react-native-paper";

export default function LoginScreen() {
  const theme = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleLogin = async () => {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      await signIn({ username: email, password });
      console.log("Login successful");
    } catch (err: any) {
      console.error("Error signing in:", err);
      const errorMessage = err.message || "An error occurred during login.";
      setError(errorMessage);
      Alert.alert("Login Error", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.outerContainer, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.innerContainer, { backgroundColor: theme.colors.background }]}>
        <Title style={styles.appTitle}>LLMSearch</Title>
        <Text variant="headlineMedium" style={styles.title}>
          Login
        </Text>
        {error && (
          <Text style={[styles.errorText, { color: theme.colors.error }]}>
            {error}
          </Text>
        )}
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
          onPress={handleLogin}
          loading={loading}
          disabled={loading}
          style={styles.button}
        >
          {loading ? "Logging in..." : "Login"}
        </Button>
        <View style={styles.linkContainer}>
          <Text>Don't have an account? </Text>
          <Button onPress={() => router.navigate("/signup")}>Sign Up</Button>
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
    marginBottom: 30, // Space below app title
    fontSize: 32, // Larger app title
  },
  title: {
    marginBottom: 20, // Space below "Login"
  },
  input: {
    width: "100%",
    marginBottom: 15, // Increased spacing
  },
  button: {
    width: "100%",
    paddingVertical: 8, // Add padding to button
    marginTop: 10,
  },
  linkContainer: {
    flexDirection: "row",
    alignItems: "center", // Align items vertically
    marginTop: 20, // Increased spacing
  },
  link: {
    marginLeft: 5,
    fontWeight: "bold", // Make link bold
  },
  errorText: {
    marginBottom: 15,
    textAlign: "center",
  },
});
