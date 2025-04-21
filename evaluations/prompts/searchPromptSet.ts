export type EvaluationPrompt = {
    type: 'keywords' | 'complexSentence' | 'news',
    searchPrompt: string
}

const searchPromptSet: EvaluationPrompt[] = [
    // Keywords
    {type: "keywords", searchPrompt: 'tiger'},
    {type: "keywords", searchPrompt: 'hong kong'},
    {type: "keywords", searchPrompt: 'artificial intelligence applications'},
    {type: "keywords", searchPrompt: 'climate change effects'},
    {type: "keywords", searchPrompt: 'renewable energy sources'},
    {type: "keywords", searchPrompt: 'quantum computing basics'},
    {type: "keywords", searchPrompt: 'space exploration missions'},
    {type: "keywords", searchPrompt: 'global economic outlook'},
    {type: "keywords", searchPrompt: 'machine learning algorithms'},

    // Complex Sentences
    {type: 'complexSentence', searchPrompt: 'Which of the following is heavier in general, a tiger or a lion?'},
    {type: 'complexSentence', searchPrompt: 'Explain the main differences between nuclear fission and nuclear fusion.'},
    {type: 'complexSentence', searchPrompt: 'What are the primary arguments for and against universal basic income?'},
    {type: 'complexSentence', searchPrompt: 'Describe the process of photosynthesis in plants, including the inputs and outputs.'},
    {type: 'complexSentence', searchPrompt: 'How does the theory of general relativity differ from special relativity?'},
    {type: 'complexSentence', searchPrompt: 'What were the key factors contributing to the fall of the Roman Empire?'},
    {type: 'complexSentence', searchPrompt: 'Compare and contrast the economic systems of capitalism and socialism.'},
    {type: "complexSentence", searchPrompt: 'Compare the climate of hong kong with singapore.'},
    {type: 'complexSentence', searchPrompt: 'What are the potential benefits and risks of using AI?'},

    // News
    {type: "news", searchPrompt: 'us china tariff rate'},
    {type: "news", searchPrompt: 'latest developments in ukraine war'},
    {type: "news", searchPrompt: 'latest fed rate'},
    {type: "news", searchPrompt: 'stock market performance this month'},
    {type: "news", searchPrompt: 'myanmar earthquake'},
    {type: "news", searchPrompt: 'canada upcoming election'},
    {type: "news", searchPrompt: 'next 7 days weather in hong kong'},
    {type: "news", searchPrompt: '2025 population trends'},
    {type: "news", searchPrompt: '5060ti price'},
];

export default searchPromptSet;
