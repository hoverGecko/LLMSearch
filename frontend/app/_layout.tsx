import { AuthProvider, useAuth } from '@/context/AuthContext';
import { useColorScheme } from '@/hooks/useColorScheme';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import 'react-native-reanimated';


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
        <Stack.Screen name="settings" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
    </ThemeProvider>
  );
};


export default function RootLayout() {
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);
  
  return (
    <AuthProvider>
        {loaded ? 
          <AuthLayout /> : 
          <View style={styles.loadingContainer}><ActivityIndicator size="large" /></View>
        }
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
