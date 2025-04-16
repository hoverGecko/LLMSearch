import OpenAI from 'openai';
import { ChatCompletionMessageParam } from 'openai/resources';

export type OpenAIWithModel = {client: OpenAI, model: string};

/**
 * If an array of OpenAI clients is provided, try to use them in order. If the one fails to respond, use the next one.
 */
export default abstract class LLMPromptCompletor {
    private readonly _clients: OpenAIWithModel[];
    constructor(clientAndModel: OpenAIWithModel | OpenAIWithModel[]) {
        if (!Array.isArray(clientAndModel)) {
            this._clients = [clientAndModel];
        } else {
            this._clients = clientAndModel;
        }
    }
    /**
     * Prompt AI with the query. Try each provided client starting with the first.
     * @param query
     * @returns AI completion of the query.
     */
    public complete = async (messages: ChatCompletionMessageParam[] | string) => {
        for (const c of this._clients) {
            const result = await c.client.chat.completions.create({
                messages: typeof messages === "string" ? [{ role: 'user', content: messages }] : messages,
                model: c.model,
                temperature: 0.1,
                frequency_penalty: 0,
                presence_penalty: 0,
                stop: null
            });
            const content = result.choices[0].message.content;
            if (content != null) {
                return content;
            }
        }
        throw new TypeError('all LLM completion tries failed.');
    };
}