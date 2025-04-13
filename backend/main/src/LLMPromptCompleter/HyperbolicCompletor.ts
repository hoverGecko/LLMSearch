import OpenAI from 'openai';
import LLMPromptCompletor from './LLMPromptCompletor';

/** Current text models on Hyperbolic as of 2024/12/04 */
type HyperbolicModel = 
    "Qwen/QwQ-32B-Preview" |
    "Qwen/Qwen2.5-Coder-32B-Instruct" |
    "meta-llama/Llama-3.2-3B-Instruct" |
    "Qwen/Qwen2.5-72B-Instruct" |
    "deepseek-ai/DeepSeek-V2.5" |
    "meta-llama/Meta-Llama-3-70B-Instruct" |
    "NousResearch/Hermes-3-Llama-3.1-70B" |
    "meta-llama/Meta-Llama-3.1-405B-Instruct" |
    "meta-llama/Meta-Llama-3.1-70B-Instruct" |
    "meta-llama/Meta-Llama-3.1-8B-Instruct";

export default class HyperbolicCompletor extends LLMPromptCompletor {
    constructor(model: HyperbolicModel) {
        super(new OpenAI({apiKey: process.env.HYPERBOLIC_AI_API_KEY, baseURL: 'https://api.hyperbolic.xyz/v1'}), model);
    }
}