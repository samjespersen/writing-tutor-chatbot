// deno-lint-ignore-file no-explicit-any
import { Anthropic } from "@/deps.ts";
import { MockAIClient } from "../test/mockAIClient.ts";
import { WRITING_TUTOR_PROMPT } from "@/src/prompt/prompt.ts";
import { LessonManager } from "./lessonManager.ts";
import { CONFIG } from "@/src/config.ts";

// Interface defining the structure of a feedback session between student and tutor
export interface FeedbackSession {
    id: string;
    studentId: string;
    essayText: string;
    studentGrade: number;
    lessonManager?: LessonManager;
    feedbackHistory: FeedbackInteraction[];
    status: 'awaiting_curriculum' | 'active' | 'completed';
}

// Interface defining a single interaction within a feedback session
export interface FeedbackInteraction {
    activityName: string;
    feedback: string;
    studentResponse?: string;
    botReplyToResponse?: string;
    timestamp: Date;
}

// Service class handling the writing tutor functionality
export class WritingTutorService {
    public anthropic: Anthropic | MockAIClient;
    private isMockClient = false;

    constructor(anthropic?: Anthropic) {
        if (!anthropic) {
            this.anthropic = new MockAIClient();
            this.isMockClient = true;
        } else {
            this.anthropic = anthropic;
        }
    }

    // Initializes a new feedback session for a student's essay
    startFeedbackSession(studentId: string, essayText: string, studentGrade: number): FeedbackSession {
        return {
            id: crypto.randomUUID(),
            studentId,
            essayText,
            studentGrade,
            feedbackHistory: [],
            status: 'awaiting_curriculum'
        };
    }

    initializeLessonManager(session: FeedbackSession, lessonPlans: any[]) {
        session.lessonManager = new LessonManager(lessonPlans);
        session.status = 'active';
    }

    // Generates AI feedback for the current sentence in the session
    async getNextFeedback(session: FeedbackSession, currentState: any): Promise<string> {
        if (session.status === 'awaiting_curriculum') {
            throw new Error('Session waiting for curriculum initialization');
        }

        if (!session.lessonManager) {
            throw new Error('Lesson manager not initialized');
        }

        if (currentState.isComplete) {
            session.status = 'completed';
            return "Congratulations! You've completed all activities!";
        }

        const prompt = this.buildPrompt(session, currentState);

        try {
            let feedback: string;

            if (this.isMockClient) {
                const response = await (this.anthropic as MockAIClient).messages.create.call(this);
                feedback = response.content[0].text;
            } else {
                const messages = session.feedbackHistory.flatMap(interaction => [
                    {
                        role: "assistant" as const,
                        content: interaction.feedback
                    },
                    ...(interaction.studentResponse ? [{
                        role: "user" as const,
                        content: interaction.studentResponse
                    }] : []),
                    ...(interaction.botReplyToResponse ? [{
                        role: "assistant" as const,
                        content: interaction.botReplyToResponse
                    }] : [])
                ]);

                messages.push({
                    role: "user" as const,
                    content: "Please provide the next activity instruction."
                });

                const response = await (this.anthropic as Anthropic).messages.create({
                    model: CONFIG.MODEL_NAME,
                    max_tokens: 4096,
                    temperature: 0.5,
                    system: prompt,
                    messages: messages
                });

                feedback = response.content.reduce((acc, block) => {
                    if ('text' in block) {
                        return acc + block.text;
                    }
                    return acc;
                }, '');
            }

            session.feedbackHistory.push({
                activityName: currentState.currentActivity.name,
                feedback,
                timestamp: new Date()
            });

            return feedback;
        } catch (_error) {
            throw new Error('Failed to generate feedback');
        }
    }

    // Constructs the AI prompt using session context and current sentence
    private buildPrompt(session: FeedbackSession, state: any): string {
        const progressHistory = state.progressHistory.map((activity: any) => 
            `Activity: ${activity.activityIndex + 1}\nStudent: ${activity.response}\nTutor: ${activity.botReply || ''}\n`
        ).join('\n');

        return WRITING_TUTOR_PROMPT
            .replace('{{currentLessonPlan.lessonPlan.objective}}', state.currentLessonPlan.lessonPlan.objective)
            .replace('{{currentLessonPlan.pedagogy}}', state.currentLessonPlan.pedagogy)
            .replace('{{currentActivity.name}}', state.currentActivity.name)
            .replace('{{currentActivity.text}}', state.currentActivity.text)
            .replace('{{currentActivity.assessmentCriteria}}', JSON.stringify(state.currentActivity.assessmentCriteria || []))
            .replace('{{studentGrade}}', session.studentGrade.toString())
            .replace('{{progressHistory}}', progressHistory);
    }

    // Calculates and returns the current progress of the feedback session
    getSessionProgress(session: FeedbackSession): {
        totalSentences: number;
        currentPosition: number;
        percentageComplete: number;
    } {
        const sentences = this.parseEssayIntoSentences(session.essayText);
        return {
            totalSentences: sentences.length,
            currentPosition: session.feedbackHistory.length + 1,
            percentageComplete: Math.round(((session.feedbackHistory.length + 1) / sentences.length) * 100)
        };
    }

    // Handles student responses to feedback and generates appropriate AI replies
    async respondToFeedback(
        session: FeedbackSession,
        studentResponse: string,
        currentState: any
    ): Promise<string> {
        if (!session.lessonManager) {
            throw new Error('Lesson manager not initialized');
        }

        const currentInteraction = session.feedbackHistory[session.feedbackHistory.length - 1];

        if (!currentInteraction) {
            throw new Error("No previous interaction found");
        }

        const prompt = this.buildPrompt(session, currentState);

        try {
            let reply: string;

            if (this.isMockClient) {
                const response = await (this.anthropic as MockAIClient).messages.create.call(this);
                reply = response.content[0].text;
            } else {
                const messages = session.feedbackHistory.flatMap(interaction => [
                    {
                        role: "assistant" as const,
                        content: interaction.feedback
                    },
                    ...(interaction.studentResponse ? [{
                        role: "user" as const,
                        content: interaction.studentResponse
                    }] : []),
                    ...(interaction.botReplyToResponse ? [{
                        role: "assistant" as const,
                        content: interaction.botReplyToResponse
                    }] : [])
                ]);

                messages.push({
                    role: "user",
                    content: studentResponse
                });

                const response = await (this.anthropic as Anthropic).messages.create({
                    model: CONFIG.MODEL_NAME,
                    max_tokens: 4096,
                    temperature: 0.5,
                    system: prompt,
                    messages: messages
                });

                reply = response.content.reduce((acc, block) => {
                    if ('text' in block) {
                        return acc + block.text;
                    }
                    return acc;
                }, '');
            }

            currentInteraction.studentResponse = studentResponse;
            currentInteraction.botReplyToResponse = reply;

            session.lessonManager?.recordActivity(studentResponse, reply);

            // Check if the activity is complete and advance if necessary
            if (this.isActivityComplete(reply)) {
                session.lessonManager?.advanceToNextActivity();
            }

            return reply;
        } catch (_error) {
            throw new Error('Failed to generate response');
        }
    }

    private isActivityComplete(aiResponse: string): boolean {
        return aiResponse.includes("Activity complete! Ready for the next activity?");
    }

    // Splits essay text into individual sentences for analysis
    private parseEssayIntoSentences(essay: string): string[] {
        // Basic sentence parsing - could be improved with NLP libraries
        const sentences = essay
            .split(/(?<=[.!?])\s+/)
            .map(s => s.trim())
            .filter(s => s.length > 0);

        return sentences;
    }

    async generateWelcomeMessage(lessonPlans: any[]): Promise<string> {
        try {
            let response;
            if (this.isMockClient) {
                response = await (this.anthropic as MockAIClient).messages.create.call(this);
            } else {
                response = await (this.anthropic as Anthropic).messages.create({
                    model: CONFIG.MODEL_NAME,
                    max_tokens: 1024,
                    temperature: 0.7,
                    messages: [
                        {
                            role: "user",
                            content: `You are a friendly writing tutor. Based on these lesson plans: ${JSON.stringify(lessonPlans)}, 
                            provide a brief welcome message, then briefly summarize what the student will be working on, and then end with words of encouragement.`
                        }
                    ]
                });
            }

            return response.content.reduce((acc: any, block: { text: any; }) => {
                if ('text' in block) {
                    return acc + block.text;
                }
                return acc;
            }, '');
        } catch (error) {
            console.error('Error generating welcome message:', error);
            return "Welcome! Let's work together to improve your writing skills. You can do this!";
        }
    }
}