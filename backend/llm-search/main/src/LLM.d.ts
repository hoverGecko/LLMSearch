interface LLM {
    public async complete(query: string): Promise<string>;
}