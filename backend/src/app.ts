import { Anthropic, Application, Router } from "../deps.ts";
import { CONFIG } from "./config.ts";
import { WritingTutorService, type FeedbackSession } from "./services/writingTutor.ts";
import type { Context, RouterContext } from "../deps.ts";
import { LessonPlanner } from "./services/lessonPlanner.ts";
import { LessonManager } from "./services/lessonManager.ts";
import type {
    CreateSessionRequest,
    CreateSessionResponse,
    GetFeedbackResponse,
    RespondToFeedbackRequest,
    RespondToFeedbackResponse,
    LessonPlannerRequest,
    LessonPlannerResponse,
    ErrorResponse
} from "./types.ts";

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
const sessions = new Map<string, FeedbackSession & { lessonManager?: LessonManager }>();

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

// Helper function to sanitize JSON string
function sanitizeJsonString(jsonStr: string): string {
    // Trim whitespace and find the last closing brace/bracket
    const trimmed = jsonStr.trim();
    const lastBrace = trimmed.lastIndexOf('}');
    const lastBracket = trimmed.lastIndexOf(']');
    const lastValidChar = Math.max(lastBrace, lastBracket);

    // If we found a valid JSON ending, truncate everything after it
    if (lastValidChar !== -1) {
        return trimmed.substring(0, lastValidChar + 1);
    }
    return trimmed;
}

// Helper function to validate request body
async function validateRequestBody<T>(ctx: Context, validator: (body: unknown) => body is T): Promise<T | null> {
    const body = await ctx.request.body().value;
    return validator(body) ? body : null;
}

// Type guards for request validation
function isCreateSessionRequest(body: unknown): body is CreateSessionRequest {
    return typeof body === 'object' && body !== null &&
        'studentId' in body && typeof body.studentId === 'string' &&
        'essayText' in body && typeof body.essayText === 'string' &&
        'studentGrade' in body && typeof body.studentGrade === 'number';
}

function isRespondToFeedbackRequest(body: unknown): body is RespondToFeedbackRequest {
    return typeof body === 'object' && body !== null &&
        'response' in body && typeof body.response === 'string';
}

function isLessonPlannerRequest(body: unknown): body is LessonPlannerRequest {
    return typeof body === 'object' && body !== null &&
        'student_text' in body && typeof body.student_text === 'string' &&
        'student_reflection' in body && typeof body.student_reflection === 'string' &&
        'student_grade' in body && typeof body.student_grade === 'number';
}

// Helper function to create error response
function createErrorResponse(message: string): ErrorResponse {
    return { error: message };
}

// Routes
router.post("/api/sessions", async (ctx: RouterContext<"/api/sessions">) => {
    const body = await validateRequestBody(ctx, isCreateSessionRequest);
    if (!body) {
        ctx.response.status = 400;
        ctx.response.body = createErrorResponse("Invalid request body");
        return;
    }

    const { studentId, essayText, studentGrade } = body;
    const session = tutorService.startFeedbackSession(studentId, essayText, studentGrade);
    sessions.set(session.id, session);

    try {
        const curriculum = await lessonPlanner.generateCurriculum({
            student_text: essayText,
            student_reflection: body.student_reflection ?? "",
            student_grade: studentGrade
        });

        if (curriculum.content[0].type === 'text') {
            const curriculumText = curriculum.content[0].text;
            console.log('Curriculum content:', curriculumText);
            const curriculumObject = JSON.parse(sanitizeJsonString(curriculumText));
            console.log('Parsed lesson plans:', curriculumObject);
            
            tutorService.initializeLessonManager(session, curriculumObject.lessonPlans);
            const welcomeMessage = await tutorService.generateWelcomeMessage(curriculumObject.lessonPlans);
            
            const response: CreateSessionResponse = { 
                ...session, 
                welcomeMessage,
                curriculum: curriculumObject.lessonPlans
            };
            ctx.response.body = response;
            return;
        }
        throw new Error('Invalid curriculum format received');
    } catch (error) {
        console.error('Error generating curriculum:', error);
        session.status = 'awaiting_curriculum';
        const response: CreateSessionResponse = { ...session };
        ctx.response.body = response;
    }
});

router.get("/api/sessions/:sessionId/feedback", async (ctx: RouterContext<"/api/sessions/:sessionId/feedback">) => {
    const { sessionId } = ctx.params;
    if (!sessionId) {
        ctx.response.status = 400;
        ctx.response.body = createErrorResponse("Session ID is required");
        return;
    }

    const session = sessions.get(sessionId);
    if (!session) {
        ctx.response.status = 404;
        ctx.response.body = createErrorResponse("Session not found");
        return;
    }

    if (!session.lessonManager) {
        ctx.response.status = 400;
        ctx.response.body = createErrorResponse("Lesson plan not initialized");
        return;
    }

    const currentState = session.lessonManager.getCurrentState();
    const feedback = await tutorService.getNextFeedback(session, currentState);
    
    const response: GetFeedbackResponse = { feedback, currentState };
    ctx.response.body = response;
});

router.post("/api/sessions/:sessionId/respond", async (ctx: RouterContext<"/api/sessions/:sessionId/respond">) => {
    const { sessionId } = ctx.params;
    if (!sessionId) {
        ctx.response.status = 400;
        ctx.response.body = createErrorResponse("Session ID is required");
        return;
    }

    const session = sessions.get(sessionId);
    if (!session) {
        ctx.response.status = 404;
        ctx.response.body = createErrorResponse("Session not found");
        return;
    }

    if (!session.lessonManager) {
        ctx.response.status = 400;
        ctx.response.body = createErrorResponse("Lesson plan not initialized");
        return;
    }

    const body = await validateRequestBody(ctx, isRespondToFeedbackRequest);
    if (!body) {
        ctx.response.status = 400;
        ctx.response.body = createErrorResponse("Invalid request body");
        return;
    }

    try {
        const { response } = body;
        session.lessonManager.recordActivity(response);

        const currentState = session.lessonManager.getCurrentState();
        const reply = await tutorService.respondToFeedback(session, response, currentState);

        const responseBody: RespondToFeedbackResponse = {
            reply,
            conversation: session.feedbackHistory[session.feedbackHistory.length - 1],
            currentState
        };
        ctx.response.body = responseBody;
    } catch (error) {
        console.error('Error processing response:', error);
        ctx.response.status = 500;
        ctx.response.body = createErrorResponse("Failed to process response");
    }
});

router.post("/api/lesson_planner", async (ctx: RouterContext<"/api/lesson_planner">) => {
    const body = await validateRequestBody(ctx, isLessonPlannerRequest);
    if (!body) {
        ctx.response.status = 400;
        ctx.response.body = createErrorResponse("Invalid request body");
        return;
    }
    
    const { student_text, student_reflection, student_grade } = body;
    const curriculum = await lessonPlanner.generateCurriculum({ 
        student_text, 
        student_reflection, 
        student_grade 
    });
    
    ctx.response.status = 200;
    const response: LessonPlannerResponse = { 
        text: curriculum.content[0].type === "text" ? curriculum.content[0].text : "" 
    };
    ctx.response.body = response;
});

// Apply router middleware
app.use(router.routes());
app.use(router.allowedMethods());

// Start server
console.log(`Server running on port ${CONFIG.PORT}`);
await app.listen({ port: CONFIG.PORT });
