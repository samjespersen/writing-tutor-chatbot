# writing-tutor-chatbot
A writing-tutor chatbot POC rapid-prototyped using Claude 3.5 via Cursor and Anthropic Workbench

## Background

When I first dove into AI tooling, I noticed an abundance of thinkpieces on LinkedIn and other platforms extolling the capabilities and potential of using models like Claude 3.5 to write code, some suggesting that in some circumstances, software developers are no longer needed. I am a software developer by trade, so I was skeptical. In my own use of AI tooling, I did not see enough to convince me AI could replace my job, at that point. Claude 3.5 had just come out and had a lot of hype surrounding it, so I decided to run an experiment to investigate these claims for myself. 


## The experiment

I imagined I was a barely technical product manager who needed make a rapid prototype of a functioning AI-powered web application. I wanted the app to be AI-powered so as to have a mix of functionality between traditional web developerment and prompt engineering. While undergoing the experiment, I acted as if I did not know how to code. I would not do anything with code without asking the model to try first. The only input I wanted to have in the IDE (Cursor) was copy-pasting AI generated code (if needed) and querying the Cursor chatbot.

#### Motivation

I decided to make a writing tutor chatbot for the following reasons:
* I have a background in education and tutoring and felt I could better play the role of "product manager" in an arena I have experience with. I could also better asses the functionality of the finished application. 
* Direct tutoring is a high-cost-high-result educational activity, so there is a lot of potential value for LLMs to unlock
* The activities of writing tutoring provide a variety of tasks for the LLM to achieve:
    - Student input via a web front-end (full stack web dev)
    - Tracking progress in a lesson plan and transforming that state into displayable data (traditional OOP style programming)
    - Writing large, complex prompts for the AI agents to follow (prompt engineering)
* I also just wanted to tinker with the idea of using generative AI models in educational contexts for my own curiosity


#### The application

To make the app, I decided to use technologies I was familiar with. So, as a part of my initial prompts to Claude via the Anthropic Workbench, I included a list of technologies I would like to utilize:

* TypeScript
* React + Bun + Vite on the frontend
* Deno2 + Anthropic SDK on the backend

Once Claude spun up an initial barebones application, I copy-pasted it into a new repo and ran its recommended commands inside Cursor. After that I only used the Cursor chatbot for development.


## Results

The persona in this experiment would be pretty pleased. From their perspective, they very quickly made a web application that uses AI to perform a complex task for very little cost. I spent between 8-10 hours running this experiment and spent less than 10 dollars (+ roughly 250 premium fast requests on Cursor) on it.

The developer running the experiment (me) was less than pleased. While the speed at which you can generate large mostly-usefull codeblocks was sometimes intoxicating, it came at quite the cost. Some of the problems with this approach I took note of:
* The code generated looks good at first glance, but often contains hallucinations that the product manager persona has to ask Claude to correct.
* The more code was added to the codebase, the more unwieldy and convoluted the logic became, which often led to typing errors.
* Correcting errors, especially typing errors, would generally introduce more errors. Correcting those errors would then lead to a new set of errors, etc. A couple of times while trying to implement a feature, Claude would go in circles with these error correction attempts and eventually I had to ask it to revert the code and I abandoned the feature.
* The prompt engineering Claude performed for the tutoring agent is pretty poor. The prompts themselves appear to be thorough and sufficiently instructive, but the agent performance is not great. I spent a lot of time trying to will Claude into improving the performance of the agents via prompt engineering without much success.

Interestingly, it never suggested using any advanced techniques that I as a developer would have tried, such as using a RAG pipeline when dealing with large contexts, or using something like sentiment analysis to better align its language to the student's input.

## Key takeaway

I think that a lightly technical product person could pretty easily make a functioning web app prototype quickly and cheaply. Furthermore, with just a few hours from a developer, the quality of that app could be vastly improved more pointed and relevant prompts, and regular refactoring sessions to keep the code tight and clean.


## To build locally:
- Install bun and deno
```bash
curl -fsSL https://bun.sh/install | bash
curl -fsSL https://deno.land/x/install/install.sh | sh
```
- Install dependencies
- See `.env.example` for environment variables
- Run backend first with `deno task start`
- Run app next with `bun run dev`

## Or, run a docker image
```bash
docker build -t writing-tutor .
docker run -p 3000:3000 -p 8000:8000 -e ANTHROPIC_API_KEY=<your_api_key_here> -e MODEL_NAME=<anthropic_model_here> writing-tutor
```
The app will be available at `localhost:3000`.
