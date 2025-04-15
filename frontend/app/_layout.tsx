import { cognitoClientId, cognitoPoolId } from '@/constants/Constants';
import { useColorScheme } from '@/hooks/useColorScheme';
import { fetchAuthSession } from '@aws-amplify/auth';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Amplify } from 'aws-amplify';
import { Hub } from 'aws-amplify/utils';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import 'react-native-reanimated';
import { AuthProvider, useAuth } from '@/context/AuthContext';

// Amplify/Cognito config
Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: cognitoPoolId, 
      userPoolClientId: cognitoClientId
    }
  }
});

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

// Handle routing to login/root depending on authentication
const AuthLayout = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const colorScheme = useColorScheme();

  useEffect(() => {
    if (isLoading) {
      return;
    }
    const isAuthScreen = segments[0] === 'login' || segments[0] === 'signup';

    console.log('Auth State:', isAuthenticated, 'Is Loading:', isLoading, 'Segments:', segments);

    if (!isAuthenticated && !isAuthScreen) {
      // Redirect to login if not authenticated and not in login/signup page
      console.log('Not logged in, redirecting to login');
      router.replace('/login');
    } else if (isAuthenticated && isAuthScreen) {
      // Redirect to index if already authenticated
      console.log('Already logged in, redirecting to index');
      router.replace('/');
    }
  }, [isAuthenticated, isLoading, segments, router]);

  // Render the main stack navigator once auth state is determined
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="search" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="signup" options={{ headerShown: false }} />
        <Stack.Screen name="settings" options={{ title: 'Settings' }} />
        <Stack.Screen name="+not-found" />
      </Stack>
    </ThemeProvider>
  );
};


export default function RootLayout() {
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });
  const router = useRouter(); // Get router instance
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null); // Use null for loading state

  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        // Attempt to get current user session
        await fetchAuthSession();
        console.log('Auth Check: Success - User is authenticated');
        setIsAuthenticated(true);
        console.log('State Update: isAuthenticated set to true');
      } catch (error) {
        // No authenticated user
        console.log('Auth Check: Failed - User is not authenticated', error);
        setIsAuthenticated(false);
        console.log('State Update: isAuthenticated set to false');
      }
    };

    checkAuthStatus();

    // Listener for auth events (signIn, signOut)
    const hubListenerCancel = Hub.listen('auth', ({ payload }) => {
      switch (payload.event) {
        case 'signedIn':
          console.log('Hub Event: signedIn');
          setIsAuthenticated(true);
          console.log('State Update (Hub): isAuthenticated set to true');
          break;
        case 'signedOut':
          console.log('Hub Event: signedOut');
          setIsAuthenticated(false);
          console.log('State Update (Hub): isAuthenticated set to false');
          break;
      }
    });

    // Cleanup listener on component unmount
    return () => {
      hubListenerCancel();
    };
  }, []);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  // Add effect for handling redirection based on auth state
  const segments = useSegments();
  useEffect(() => {
    console.log(`Redirection Check: isAuthenticated = ${isAuthenticated}, segments = ${JSON.stringify(segments)}`);
    // Ensure isAuthenticated is determined and router is ready
    if (isAuthenticated === null) {
      console.log('Redirection Check: Skipping (isAuthenticated is null)');
      return;
    }

    // Cast segment to string for comparison to bypass strict type checking
    const currentSegment = segments[0] as string; 
    const inAuthGroup = currentSegment === 'login' || currentSegment === 'signup';
    console.log(`Redirection Check: inAuthGroup = ${inAuthGroup}`);

    if (isAuthenticated && inAuthGroup) {
      console.log('Redirection Action: Authenticated user in auth group -> navigating to /');
      router.replace({ pathname: '/' }); // Use object format
    } else if (!isAuthenticated && !inAuthGroup) {
      console.log('Redirection Action: Unauthenticated user outside auth group -> navigating to /login');
      // Redirect unauthenticated user from protected routes to login
      // Check if the current segment is not already login/signup to prevent loop
      // Use the casted string for comparison here too
      if (currentSegment !== 'login' && currentSegment !== 'signup') {
         console.log(`Redirection Action: Current segment (${currentSegment}) is not login/signup, redirecting.`);
         router.replace({ pathname: '/login' }); // Use object format
      } else {
         console.log(`Redirection Action: Current segment (${currentSegment}) is login/signup, no redirect needed.`);
      }
    } else {
      console.log('Redirection Action: No redirection needed.');
    }
  }, [isAuthenticated, segments]); // Rerun effect when auth state or segments change


  // Show loading indicator while fonts load or auth state is being determined
  if (!loaded || isAuthenticated === null) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <AuthProvider>
      <AuthLayout />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  }
});