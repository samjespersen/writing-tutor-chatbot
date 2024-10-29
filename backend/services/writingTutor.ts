// services/writingTutor.ts
import { Anthropic } from "../deps.ts";
import { MockAIClient } from "@/test/mockAIClient.ts";

export interface FeedbackSession {
    id: string;
    studentId: string;
    essayText: string;
    currentSentenceIndex: number;
    feedbackHistory: FeedbackInteraction[];
    status: 'active' | 'completed';
}

export interface FeedbackInteraction {
    sentenceDiscussed: string;
    feedback: string;
    studentResponse?: string;
    botReplyToResponse?: string;
    timestamp: Date;
}

const WRITING_TUTOR_PROMPT = `
You are a helpful assistant working with individual middle-school students on their writing assignments. 
Your role is to:
- Focus on one key improvement area per feedback interaction
- Provide specific, actionable feedback that a middle school student can understand and apply
- Use a consistent structure for feedback:
  1. Point out what works well (positive reinforcement)
  2. Identify one area for improvement
  3. Provide a clear example of how to improve
- Keep explanations concise (2-3 sentences maximum per point)
- Use age-appropriate vocabulary
- Maintain an encouraging, supportive tone
- Wait for student acknowledgment before moving to next sentences

When explaining grammar or writing concepts:
- Use simple analogies
- Provide before/after examples
- Avoid technical terminology unless necessary

If any shared text contains personal identifying information, do not reference it directly in your responses.

Current essay text: {{essayText}}
Current sentence being discussed: {{currentSentence}}
Previous feedback history: {{feedbackHistory}}

Provide feedback for the current sentence focusing on one key improvement opportunity.
`;

export class WritingTutorService {
    public anthropic: Anthropic | MockAIClient;
    private isMockClient = false;

    constructor(api_key?: string) {
        if (!api_key) {
            this.anthropic = new MockAIClient();
            this.isMockClient = true;
        } else {
            this.anthropic = new Anthropic({ apiKey: api_key });
        }
    }


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

    async getNextFeedback(session: FeedbackSession): Promise<string> {
        const sentences = this.parseEssayIntoSentences(session.essayText);
        const currentSentence = sentences[session.currentSentenceIndex];
        const prompt = this.buildPrompt(session, currentSentence);

        try {
            let feedback: string;

            if (this.isMockClient) {
                const response = await (this.anthropic as MockAIClient).messages.create.call();
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

        } catch (error) {
            throw new Error('Failed to generate feedback');
        }
    }

    moveToNextSentence(session: FeedbackSession): void {
        const sentences = this.parseEssayIntoSentences(session.essayText);
        session.currentSentenceIndex++;

        if (session.currentSentenceIndex >= sentences.length) {
            session.status = 'completed';
        }
    }

    private parseEssayIntoSentences(essay: string): string[] {
        // Basic sentence parsing - could be improved with NLP libraries
        const sentences = essay
            .split(/(?<=[.!?])\s+/)
            .map(s => s.trim())
            .filter(s => s.length > 0);

        return sentences;
    }

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

    // Helper method to get session progress
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
                const response = await (this.anthropic as MockAIClient).messages.create.call();
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
        } catch (error) {
            throw new Error('Failed to generate response');
        }
    }
}