import { apiKey, backendUrl } from '@/constants/Constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import React, { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';

// key of auth token in expo-secure-store
const TOKEN_KEY = 'authToken';

interface User {
  email: string;
}

interface AuthContextType {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuthStatus: () => Promise<void>;
  // enable path hinting
  authFetch: (path: BackendAPIPath | (string & {}), options?: RequestInit, baseUrl?: string) => Promise<Response>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

// Web does not support expo-secure-store, so use AsyncStorage instead
const itemStorage = Platform.OS === "web" ? {
  get: (key: string) => AsyncStorage.getItem(key),
  delete: (key: string) => AsyncStorage.removeItem(key),
  set: (key: string, value: string) => AsyncStorage.setItem(key, value)
} : {
  get: (key: string) => SecureStore.getItemAsync(key),
  delete: (key: string) => SecureStore.deleteItemAsync(key),
  set: (key: string, value: string) => SecureStore.setItemAsync(key, value)
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true); // Start loading initially

  // Try to load user status on mount
  useEffect(() => {
    checkAuthStatus();
  }, []);

  // Check if user is authenticated, if yes, set states to respective values
  const checkAuthStatus = async () => {
    setIsLoading(true);
    try {
      const storedToken = await itemStorage.get(TOKEN_KEY);
      if (storedToken) {
        console.log('Token found in storage, verifying...');
        // Verify token with backend /status endpoint
        const response = await fetch(`${backendUrl}/status`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${storedToken}`,
            'X-Api-Key': apiKey || ''
          },
        });

        if (response.ok) {
          const data = await response.json();
          console.log('/status check successful:', data);
          setToken(storedToken);
          setUser(data.user);
          setIsAuthenticated(true);
        } else {
          console.log('/status check failed:', response.status);
          // Token is invalid or expired, clear it
          await logout(); // Use logout to clear state and storage
        }
      } else {
        console.log('No token found in storage.');
        setIsAuthenticated(false);
        setToken(null);
        setUser(null);
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      // Ensure clean state on error
      setIsAuthenticated(false);
      setToken(null);
      setUser(null);
      await itemStorage.delete(TOKEN_KEY); // Clear potentially bad token
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`${backendUrl}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': apiKey || ''
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Login failed with status: ${response.status}`);
      }

      const data = await response.json();
      const newToken = data.token;

      if (newToken) {
        await itemStorage.set(TOKEN_KEY, newToken);
        setToken(newToken);
        // Fetch user data after successful login
        await checkAuthStatus(); // Re-use checkAuthStatus to verify and set user
      } else {
        throw new Error('Login response did not include a token.');
      }
    } catch (error) {
      console.error('Login error:', error);
      await logout(); // Ensure clean state on login failure
      setIsLoading(false); // Explicitly set loading false on error
      throw error; // Re-throw error to be caught by UI
    }
  };

  const signup = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`${backendUrl}/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': apiKey || ''
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Signup failed with status: ${response.status}`);
      }
      // Signup successful, user needs to login separately
      console.log('Signup successful');
    } catch (error) {
      console.error('Signup error:', error);
      throw error; // Re-throw error to be caught by UI
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    console.log('Logging out...');
    try {
      await itemStorage.delete(TOKEN_KEY);
    } catch (error) {
      console.error('Error removing token from storage during logout:', error);
    } finally {
      // Reset state regardless of storage deletion success
      setToken(null);
      setUser(null);
      setIsAuthenticated(false);
      setIsLoading(false); // Ensure loading is false after logout
    }
  };

  const authFetch = useCallback(async (path: string, options: RequestInit = {}, baseUrl: string = backendUrl): Promise<Response> => {
    const headers = new Headers(options.headers);
    headers.set('Authorization', `Bearer ${await itemStorage.get(TOKEN_KEY)}`);
    if (apiKey) {
      headers.set('X-Api-Key', apiKey);
    }
    // default content type to json if body is set
    if (options.body && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
    }

    const fullUrl = `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
    console.log(`authenticatedFetch: ${options.method || 'GET'} ${fullUrl}`);
    return fetch(fullUrl, {
      ...options,
      headers,
    });
  }, [isLoading, isAuthenticated, token]);


  const value = {
    token,
    user,
    isAuthenticated,
    isLoading,
    authFetch,
    login,
    signup,
    logout,
    checkAuthStatus
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export type BackendAPIPath = 
  'login' | 'signup' | 'generate-general-summary' | 'generate-webpage-summary' | 'process-url' | 'search'

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
