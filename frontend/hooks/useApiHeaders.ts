import { apiKey } from "@/constants/Constants";
import { useAuth } from "@/context/AuthContext";
import { useCallback } from "react";

// Helper function to create API headers
const useApiHeaders = () => {
    const { token } = useAuth();
    return useCallback((isJson = false): HeadersInit => {
        const headers: HeadersInit = {};
        if (apiKey) {
            headers['x-api-key'] = apiKey;
        }
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        if (isJson) {
            headers['Content-Type'] = 'application/json';
        }
        return headers;
    }, [token]);
}

export default useApiHeaders;