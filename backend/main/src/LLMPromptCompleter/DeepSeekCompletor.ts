import OpenAI from 'openai';
import LLMPromptCompletor from './LLMPromptCompletor';

type DeepSeekModel = 
    "deepseek-chat" |
    "deepseek-reasoner"

export default class DeepSeekCompletor extends LLMPromptCompletor {
    constructor(model : DeepSeekModel = "deepseek-chat") {
        super(new OpenAI({apiKey: process.env.DEEPSEEK_API_KEY, baseURL: 'https://api.deepseek.com'}), model);
    }
}