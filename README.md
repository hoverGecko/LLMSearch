# LLMSearch
LLMSearch is a cross-platform web-searching application that fetches and processes multiple batches of search results from search engine APIs, summarizes the results using LLMs and presents the results to the user in the format of traditional search engines.

## How to run
### Frontend
Under [frontend/](frontend/), run `npm i` to install the necessary modules, then run `npm run web` to start the web development server.
### Backend
Running the backend locally requires AWS SAM to be installed.
Under [backend/main/](backend/llm-search/main/), run `npm i` to install the necessary modules.
Then, run `npm run dev` to start the local development server.

## Hosting
### Frontend
#### Exporting files
Under [frontend/](frontend/), run `npm run export`, which runs `npx expo export -p web`.
The output directory is `frontend/dist`.
#### Using hosting platform (e.g. Cloudflare Pages)
Set root directory to [frontend/](frontend/) and output directory to dist (frontend/dist).
Set build command to `npm ci && npm run export`.
### Backend
Run `sam deploy --guided` to deploy the AWS SAM app to AWS.

## Current Completed Progress ✅
- Creating backend stub
- Creating frontend prototype
- LLM-generated general summary and partial summary of search results
- Hosting backend on AWS
- Hosting frontend (on Cloudflare Pages)
- General summary chatbot function
- Recursive search (now with LLM-generated initial search queries and search suggestions)

## Features to be implemented
- Authorization (registration), search history
- Evaluations of effectiveness done by LLM