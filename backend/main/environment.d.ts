declare global {
    namespace NodeJS {
        interface ProcessEnv {
            BING_API_KEY: string;
            HYPERBOLIC_AI_API_KEY: string;
            DEEPSEEK_API_KEY: string;
            OPEN_ROUTER_API_KEY: string;
        }
    }
}
export {};