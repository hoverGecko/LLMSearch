declare global {
    namespace NodeJS {
        interface ProcessEnv {
            BING_API_KEY: string;
            AZURE_AI_API_KEY: string;
            AZURE_AI_BASE_URL: string;
        }
    }
}
export {};