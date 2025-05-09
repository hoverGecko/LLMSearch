if (!process.env.EXPO_PUBLIC_BACKEND_URL) {
    throw new Error('EXPO_PUBLIC_BACKEND_URL is not set. App will not function.')
}

export const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL;
export const apiKey = process.env.EXPO_PUBLIC_API_KEY;

if (!apiKey) {
    console.warn("API Key (EXPO_PUBLIC_API_KEY) is not set. Requests might fail if the backend requires it.");
}