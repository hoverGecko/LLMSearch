# LLM Search Evaluations
## How to run
After configuring the environment variables in [.env](./.env), run `npm i` to install the require packages, then run `npm run evaluate` to output results in [./results](./results).
## Environment variables
Store the following variables in [.env](./.env):
```
OPEN_ROUTER_API_KEY=...
USER_EMAIL=<LLM Search account email>
USER_PASSWORD=<LLM Search account password>
LLM_SEARCH_URL=<LLM Search Backend URL>
```
## Prompts
### LLM Prompts
The prompts used by the LLM judge are [./prompts/judge_relevance.txt](./prompts/judge_relevance.txt), [./prompts/judge_conciseness.txt](./prompts/judge_conciseness.txt) and [./prompts/judge_completeness.txt](./prompts/judge_completeness.txt).
The prompt that instructs baseline LLMs to act as a search assistant is [./prompts/search_prompt.txt](./prompts/search_prompt.txt).
### Search Prompts
Modify [./prompts/searchPromptSet.ts](./prompts/searchPromptSet.ts) to change the search prompts.
## Models
Modify `BASELINE_MODELS` in [evaluate.ts](./evaluate.ts) to change the LLMs to be compared. 
Modify `EVALUATE_LLM_SEARCH` in [evaluate.ts](./evaluate.ts) to enable or disable the evaluation of LLMSearch.
Modify `JUDGE_MODEL` in [evaluate.ts](./evaluate.ts) to change the judge LLM.