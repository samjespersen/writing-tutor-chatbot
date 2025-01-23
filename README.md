# writing-tutor-chatbot
A writing-tutor chatbot POC rapid-prototypes using Claude 3.5 via Cursor and Anthropic Workbench

## Key Takeaways

#### On building with AI
I've seen demonstrations of rapid prototyping with AI before, but until I tried it myself, I didn't fully appreciate what something like Cursor can do. The self-imposed restriction of using as much AI as possible to design, code, and fix the (many) errors was very informative to me. I explored the limitations of this approach and brainstormed ways to slow down and improve the process to get closer to production-level code. 

However, the rapid prototyping was just plain fun. After finishing most of this project, I immediately started building tools for my home server that I had been putting off for months using this same approach. I can't imagine a better way to get something done quick.

#### On development efficiency
I spent close to 10 dollars on Anthropic credits for this project, plus about 250 premium fast requests on Cursor. I was not being strategic about how I was using the models, I just wanted to go as fast as possible. It was fast, but it was expensive. For my next project I plan on offloading the simple prompts to my local AI rig in order to save the big beefy tasks for Claude.

#### On prompt engineering
I have some experience with prompt engineering from my work at Sensible, but I wanted to see how well Claude could do making effective prompts for the AI agents. It has some trouble with transitioning between tasks, but for the most part did a good job. Before I thought to use XML in my prompts, the app was mostly built and it caused too many regressions so I scrapped the idea for this project.

#### Is the app any good?
It works, but it's not amazing. The tutoring agent sometimes forgets where it is in the lesson plan, and it doesn't do a good enough job at tailoring its tasks and language to the grade of the student. This is (I think) due to the system prompts not being structured well enough. I experimented with different ways of structuring the system prompts, but many of the suggestions I got did not result in better behavior. This was another big downside of the rapid prototyping approach -- I would have liked to spend more time personally tinkering with the prompts instead of hoping the AI could get there with minimal guidance.

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
