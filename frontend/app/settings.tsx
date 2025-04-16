import React from "react";
import { StyleSheet, View, Alert } from "react-native";
import { Button, Text, Title, useTheme } from "react-native-paper";
import BackButton from "@/components/BackButton";
import { useAuth } from "@/context/AuthContext";

export default function SettingsScreen() {
  const theme = useTheme();
  const { user, logout } = useAuth();

  const handleSignOut = async () => {
    try {
      await logout();
      console.log("Logout successful from Settings");
    } catch (error) {
      console.error("Error logging out from Settings: ", error);
      Alert.alert(
        "Sign Out Error",
        (error as Error).message || "An unexpected error occurred."
      );
    }
  };

  return (
    <View
      style={[styles.outerContainer, { backgroundColor: theme.colors.background }]}
    >
      <View
        style={[styles.innerContainer, { backgroundColor: theme.colors.background }]}
      >
        <BackButton />
        <View>
          <Title style={styles.title}>Settings</Title>
        </View>
        <View>
          <Title style={{marginBottom: 10}}>Account</Title>
          <Text>  {user?.email ?? '-'}</Text>
        </View>
        <View>
          <Title>Sign out</Title>
          <View style={{alignItems: 'center'}}>
            <Button mode="contained" onPress={handleSignOut} style={styles.button}>
              Sign out
            </Button>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    alignItems: "center",
    width: "100%",
  },
  innerContainer: {
    flex: 1,
    padding: 30,
    maxWidth: 1000,
    width: "100%",
    gap: 20
  },
  closeButton: {
    position: "absolute",
    top: 15,
    right: 15,
    zIndex: 1,
  },
  title: {
    marginBottom: 30,
    alignSelf: "flex-start",
  },
  button: {
    width: "100%",
    paddingVertical: 8,
    marginTop: 20,
    maxWidth: 400,
  },
});
