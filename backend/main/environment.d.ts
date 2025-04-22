declare global {
    namespace NodeJS {
        interface ProcessEnv {
            BING_API_KEY: string;
            HYPERBOLIC_AI_API_KEY: string;
            DEEPSEEK_API_KEY: string;
            OPEN_ROUTER_API_KEY: string;
            GOOGLE_SEARCH_API_KEY: string;
            GOOGLE_SEARCH_ENGINE_ID: string;
        }
    }
}
export {};