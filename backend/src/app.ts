import { Anthropic, Application, Router } from "../deps.ts";
import { CONFIG } from "./config.ts";
import { WritingTutorService, type FeedbackSession } from "./services/writingTutor.ts";
import type { Context, RouterContext } from "../deps.ts";
import { LessonPlanner } from "./services/lessonPlanner.ts";

const app = new Application();
const router = new Router();
const anthropicClient = new Anthropic({
    apiKey: CONFIG.ANTHROPIC_API_KEY, defaultHeaders: {
        'anthropic-beta': 'prompt-caching-2024-07-31'
    }
});

const tutorService = new WritingTutorService(anthropicClient);
const lessonPlanner = new LessonPlanner(anthropicClient);

// Enable CORS
app.use(async (ctx, next) => {
    ctx.response.headers.set("Access-Control-Allow-Origin", "*");
    ctx.response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    ctx.response.headers.set("Access-Control-Allow-Headers", "Content-Type");

    if (ctx.request.method === "OPTIONS") {
        ctx.response.status = 204;
        return;
    }

    await next();
});

// Add request logging middleware
app.use(async (ctx, next) => {
    const start = Date.now();
    await next();
    const ms = Date.now() - start;
    console.log(`${ctx.request.method} ${ctx.request.url} - ${ms}ms`);
});

app.use(async (ctx, next) => {
    console.log(`${ctx.request.method} ${ctx.request.url.pathname}`);
    await next();
});

// Session management (in-memory for demo purposes)
const sessions = new Map<string, FeedbackSession>();

// JSON response validation
app.use(async (ctx, next) => {
    await next();

    if (ctx.response.headers.get('Content-Type')?.includes('application/json')) {
        const body = ctx.response.body;
        try {
            // Test if response can be properly stringified
            const jsonString = JSON.stringify(body);
            JSON.parse(jsonString); // Test if it can be parsed back
        } catch (error) {
            console.error('Invalid JSON response:', body);
            console.error('Stringify error:', error);

            // Optionally sanitize the response
            ctx.response.body = {
                error: 'Invalid JSON response generated',
                originalBody: String(body)
            };
        }
    }
});


// Middleware for error handling
app.use(async (ctx, next) => {
    try {
        await next();
    } catch (err) {
        console.error("ERROR!:", err);
        ctx.response.status = 500;
        ctx.response.body = { error: "Internal server error" };
    }
});

// Routes
router.post("/api/sessions", async (ctx: Context) => {
    const body = await ctx.request.body().value;
    const { studentId, essayText } = body;

    const session = tutorService.startFeedbackSession(studentId, essayText);
    sessions.set(session.id, session);

    ctx.response.body = session
});



router.get("/api/sessions/:sessionId/feedback", async (ctx: RouterContext<string>) => {
    const { sessionId } = ctx.params;

    if (!sessionId) {
        ctx.response.status = 400;
        ctx.response.body = { error: "Session ID is required" };
        return;
    }

    const session = sessions.get(sessionId);

    if (!session) {
        ctx.response.status = 404;
        ctx.response.body = { error: "Session not found" };
        return;
    }

    const feedback = await tutorService.getNextFeedback(session);
    ctx.response.body = { feedback }
});

router.post("/api/sessions/:sessionId/next", (ctx: RouterContext<string>) => {
    const { sessionId } = ctx.params;

    if (!sessionId) {
        ctx.response.status = 400;
        ctx.response.body = { error: "Session ID is required" };
        return;
    }

    const session = sessions.get(sessionId);

    if (!session) {
        ctx.response.status = 404;
        ctx.response.body = { error: "Session not found" };
        return;
    }

    tutorService.moveToNextSentence(session);
    ctx.response.body = { status: session.status };
});

router.post("/api/sessions/:sessionId/respond", async (ctx: RouterContext<"/api/sessions/:sessionId/respond">) => {
    const { sessionId } = ctx.params;

    if (!sessionId) {
        ctx.response.status = 400;
        ctx.response.body = { error: "Session ID is required" };
        return;
    }

    const session = sessions.get(sessionId);

    if (!session) {
        ctx.response.status = 404;
        ctx.response.body = { error: "Session not found" };
        return;
    }

    try {
        // Get the student's response from request body
        const body = await ctx.request.body().value;
        const { response } = body;

        if (!response) {
            ctx.response.status = 400;
            ctx.response.body = { error: "Response text is required" };
            return;
        }

        const reply = await tutorService.respondToFeedback(session, response);

        ctx.response.body = JSON.stringify({
            reply,
            conversation: session.feedbackHistory[session.feedbackHistory.length - 1]
        }, null, 2);
    } catch (error) {
        console.error('Error processing response:', error);
        ctx.response.status = 500;
        ctx.response.body = { error: "Failed to process response" };
    }
});

router.post("/api/lesson_planner", async (ctx: RouterContext<"/api/lesson_planner">) => {
    const body = await ctx.request.body().value;
    const { student_text, student_reflection, student_grade } = body;
    const curriculum = await lessonPlanner.generateCurriculum({ student_text, student_reflection, student_grade });
    ctx.response.status = 200;
    ctx.response.body = { text: curriculum.content[0].type == "text" ? curriculum.content[0].text : "" }
});

// Apply router middleware
app.use(router.routes());
app.use(router.allowedMethods());

// Start server
console.log(`Server running on port ${CONFIG.PORT}`);
await app.listen({ port: CONFIG.PORT });
