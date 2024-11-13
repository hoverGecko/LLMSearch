import { AzureOpenAI } from 'openai';

type AzureOpenAiDeployment = 'gpt-35-turbo';

export default class AzureGPT implements LLM {
    private client: AzureOpenAI;
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
        private model: AzureOpenAiDeployment = 'gpt-35-turbo',
    ) {
        this.client = new AzureOpenAI({ apiKey, endpoint, apiVersion, deployment });
    }

    /**
     * Prompt AI with the query.
     * @param query
     * @returns AI completion of the query.
     */
    public complete = async (query: string) => {
        const result = await this.client.chat.completions.create({
            messages: [{ role: 'user', content: query }],
            model: this.model,
            max_tokens: 800,
            temperature: 0.7,
            top_p: 0.95,
            frequency_penalty: 0,
            presence_penalty: 0,
            stop: null
        });

        const content = result.choices[0].message.content;
        if (content == null) {
            throw new TypeError('content of first choices in completion is null or undefined.');
        }

        return content;
    };
}
