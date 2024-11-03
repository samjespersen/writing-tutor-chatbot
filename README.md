# writing-tutor-chatbot
A writing-tutor chatbot POC powered by Claude 3.5


## To build locally:
- Install bun and deno
```bash
curl -fsSL https://bun.sh/install | bash
curl -fsSL https://deno.land/x/install/install.sh | sh
```
- Install dependencies
- Run backend first with `deno task start`
- Run app next with `bun run dev`

## Or, run a docker image
```bash
docker build -t writing-tutor .
docker run -p 3000:3000 -p 8000:8000 -e ANTHROPIC_API_KEY=<your_api_key_here> writing-tutor
```
