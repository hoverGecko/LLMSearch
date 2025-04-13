export const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:8001'; // Use env var for URL too
export const apiKey = process.env.EXPO_PUBLIC_API_KEY;

if (!apiKey) {
    console.warn("API Key (EXPO_PUBLIC_API_KEY) is not set. Requests might fail if the backend requires it.");
}
