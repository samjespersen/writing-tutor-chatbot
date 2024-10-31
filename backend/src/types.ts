import type { LessonPlan } from "@/src/services/lessonManager.ts";
import type { FeedbackSession, FeedbackInteraction } from "./services/writingTutor.ts";

// POST /api/sessions
export interface CreateSessionRequest {
    studentId: string;
    essayText: string;
    studentGrade: number;
    student_reflection?: string;
}

export interface CreateSessionResponse extends FeedbackSession {
    welcomeMessage?: string;
    curriculum?: LessonPlan[];
}

// GET /api/sessions/:sessionId/feedback
export interface GetFeedbackResponse {
    feedback: string;
    currentState: {
        currentLessonPlan: {
            pedagogy: 'SAFE' | 'MPR';
            lessonPlan: {
                objective: string;
                commonCoreStandards: string[];
                themes: string[];
                activities: Array<{
                    order: number;
                    name: string;
                    text: string;
                    theme: string;
                    strategy?: string;
                    assessmentCriteria?: string[];
                }>;
            };
        };
        currentActivity: {
            order: number;
            name: string;
            text: string;
            theme: string;
            strategy?: string;
            assessmentCriteria?: string[];
        };
        progressHistory: Array<{
            lessonIndex: number;
            activityIndex: number;
            response: string;
            botReply?: string;
        }>;
        isComplete: boolean;
    };
}

// POST /api/sessions/:sessionId/respond
export interface RespondToFeedbackRequest {
    response: string;
}

export interface RespondToFeedbackResponse {
    reply: string;
    conversation: FeedbackInteraction;
    currentState: GetFeedbackResponse['currentState'];
}

// POST /api/lesson_planner
export interface LessonPlannerRequest {
    student_text: string;
    student_reflection: string;
    student_grade: number;
}

export interface LessonPlannerResponse {
    text: string;
}

// Error Response
export interface ErrorResponse {
    error: string;
    originalBody?: string;
}
