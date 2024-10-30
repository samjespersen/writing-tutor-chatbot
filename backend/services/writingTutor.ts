import { Anthropic } from "@/deps.ts";
import { MockAIClient } from "@/test/mockAIClient.ts";
import { WRITING_TUTOR_PROMPT } from "@/prompt/prompt.ts";

// Interface defining the structure of a feedback session between student and tutor
export interface FeedbackSession {
    id: string;
    studentId: string;
    essayText: string;
    currentSentenceIndex: number;
    feedbackHistory: FeedbackInteraction[];
    status: 'active' | 'completed';
}

// Interface defining a single interaction within a feedback session
export interface FeedbackInteraction {
    sentenceDiscussed: string;
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
    startFeedbackSession(studentId: string, essayText: string): FeedbackSession {
        return {
            id: crypto.randomUUID(),
            studentId,
            essayText,
            currentSentenceIndex: 0,
            feedbackHistory: [],
            status: 'active'
        };
    }

    // Generates AI feedback for the current sentence in the session
    async getNextFeedback(session: FeedbackSession): Promise<string> {
        const sentences = this.parseEssayIntoSentences(session.essayText);
        const currentSentence = sentences[session.currentSentenceIndex];
        const prompt = this.buildPrompt(session, currentSentence);

        try {
            let feedback: string;

            if (this.isMockClient) {
                const response = await (this.anthropic as MockAIClient).messages.create.call(this);
                feedback = response.content[0].text;
            } else {
                const response = await (this.anthropic as Anthropic).messages.create({
                    model: "claude-3-5-sonnet-20241022",
                    max_tokens: 4096,
                    temperature: 0.5,
                    system: prompt,
                    messages: [
                        {
                            role: "user",
                            content: "Please provide feedback on the current sentence."
                        }
                    ]
                });

                feedback = response.content.reduce((acc, block) => {
                    if ('text' in block) {
                        return acc + block.text;
                    }
                    return acc;
                }, '');
            }

            // Update session history
            session.feedbackHistory.push({
                sentenceDiscussed: currentSentence,
                feedback: feedback,
                timestamp: new Date()
            });

            return feedback;

        } catch (_error) {
            throw new Error('Failed to generate feedback');
        }
    }

    // Advances the session to the next sentence or completes it if finished
    moveToNextSentence(session: FeedbackSession): void {
        const sentences = this.parseEssayIntoSentences(session.essayText);
        session.currentSentenceIndex++;

        if (session.currentSentenceIndex >= sentences.length) {
            session.status = 'completed';
        }
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

    // Constructs the AI prompt using session context and current sentence
    private buildPrompt(session: FeedbackSession, currentSentence: string): string {
        // Create a simplified version of feedback history for the prompt
        const simplifiedHistory = session.feedbackHistory.map(interaction => ({
            sentence: interaction.sentenceDiscussed,
            feedback: interaction.feedback,
            timestamp: interaction.timestamp.toISOString()
        }));

        return WRITING_TUTOR_PROMPT
            .replace('{{essayText}}', session.essayText)
            .replace('{{currentSentence}}', currentSentence)
            .replace('{{feedbackHistory}}', JSON.stringify(simplifiedHistory, null, 2));
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
            currentPosition: session.currentSentenceIndex + 1,
            percentageComplete: Math.round(((session.currentSentenceIndex + 1) / sentences.length) * 100)
        };
    }

    // Handles student responses to feedback and generates appropriate AI replies
    async respondToFeedback(session: FeedbackSession, studentResponse: string): Promise<string> {
        const currentInteraction = session.feedbackHistory[session.feedbackHistory.length - 1];

        if (!currentInteraction) {
            throw new Error("No previous interaction found");
        }

        const prompt = `
    Previous sentence: ${currentInteraction.sentenceDiscussed}
    My feedback: ${currentInteraction.feedback}
    Student response: ${studentResponse}
    
    Please provide a helpful reply to the student's response. Keep the conversation focused on improving their writing. Be encouraging and specific in your guidance.`;

        try {
            let reply: string;

            if (this.isMockClient) {
                const response = await (this.anthropic as MockAIClient).messages.create.call(this);
                reply = response.content[0].text;
            } else {
                const response = await (this.anthropic as Anthropic).messages.create({
                    model: "claude-3-5-sonnet-20241022",
                    max_tokens: 4096,
                    temperature: 0.5,
                    messages: [
                        {
                            role: "user",
                            content: prompt
                        }
                    ]
                });

                reply = response.content.reduce((acc, block) => {
                    if ('text' in block) {
                        return acc + block.text;
                    }
                    return acc;
                }, '');
            }

            // Update the current interaction
            currentInteraction.studentResponse = studentResponse;
            currentInteraction.botReplyToResponse = reply;

            return reply;
        } catch (_error) {
            throw new Error('Failed to generate response');
        }
    }
}