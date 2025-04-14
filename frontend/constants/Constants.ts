export const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:8001';
export const apiKey = process.env.EXPO_PUBLIC_API_KEY;
export const cognitoPoolId = process.env.EXPO_PUBLIC_COGNITO_POOL_ID!;
export const cognitoClientId = process.env.EXPO_PUBLIC_COGNITO_CLIENT_ID!;

if (!apiKey) {
    console.warn("API Key (EXPO_PUBLIC_API_KEY) is not set. Requests might fail if the backend requires it.");
}

if (!cognitoPoolId || !cognitoPoolId) {
    throw new Error("Cognito Pool ID or Client ID is not set up in env.")
}
