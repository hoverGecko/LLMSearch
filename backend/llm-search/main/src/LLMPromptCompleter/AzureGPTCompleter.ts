import { AzureOpenAI } from 'openai';
import LLMPromptCompleter from './LLMPromptCompleter';

type AzureOpenAiDeployment = 'gpt-35-turbo';

export default class AzureGPTCompleter extends LLMPromptCompleter {
    /**
     * Create AzureOpenAI client and store the specified LLM to be used.
     * @param apiKey Azure AI key
     * @param model LLM to be used
     */
    constructor(
        apiKey: string,
        endpoint: string,
        apiVersion: string = '2024-05-01-preview',
        deployment: AzureOpenAiDeployment = 'gpt-35-turbo',
        model: AzureOpenAiDeployment = 'gpt-35-turbo',
    ) {
        super(new AzureOpenAI({ apiKey, endpoint, apiVersion, deployment }), model);
    }
}
