import { Application, Router } from "../backend/deps.ts";
import { CONFIG } from "../backend/config.ts";
import { WritingTutorService, type FeedbackSession } from "./services/writingTutor.ts";
import type { Context, RouterContext } from "../backend/deps.ts";
// import { RateLimiter } from "./middleware/rateLimiter.ts";

const app = new Application();
const router = new Router();

const tutorService = new WritingTutorService(CONFIG.ANTHROPIC_API_KEY);

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

    ctx.response.body = JSON.stringify(session, null, 2);
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
    ctx.response.body = JSON.stringify({ feedback }, null, 2);
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

// Apply router middleware
app.use(router.routes());
app.use(router.allowedMethods());

// Start server
console.log(`Server running on port ${CONFIG.PORT}`);
await app.listen({ port: CONFIG.PORT });
