import OpenAI from 'openai';
import { ChatCompletionMessageParam } from 'openai/resources';

export default abstract class LLMPromptCompletor {
    constructor(private client: OpenAI, readonly model: string) {}

    /**
     * Prompt AI with the query.
     * @param query
     * @returns AI completion of the query.
     */
    public complete = async (messages: ChatCompletionMessageParam[] | string) => {
        const result = await this.client.chat.completions.create({
            messages: typeof messages === "string" ? [{ role: 'user', content: messages }] : messages,
            model: this.model,
            temperature: 0.1,
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
