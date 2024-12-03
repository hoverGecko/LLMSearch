import OpenAI from 'openai';

export default abstract class LLMPromptCompleter {
    constructor(private client: OpenAI, private model: string) {}

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
