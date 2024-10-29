import { describe, it, expect, use, chaiAsPromised } from '@/deps.ts';
import { WritingTutorService } from "@/services/writingTutor.ts";
import { MockAIClient } from "@/test/mockAIClient.ts";
import { spy } from "npm:sinon";

use(chaiAsPromised);

describe("WritingTutorService", () => {
    let mockAnthropicClient: MockAIClient;
    let writingTutorService: WritingTutorService;

    function setup() {
        writingTutorService = new WritingTutorService();
        mockAnthropicClient = writingTutorService.anthropic as MockAIClient;
    }

    describe("startFeedbackSession", () => {
        it("should create a new feedback session", () => {
            setup();
            const result = writingTutorService.startFeedbackSession("student1", "Sample essay text");

            expect(result).to.deep.include({
                studentId: "student1",
                essayText: "Sample essay text",
                currentSentenceIndex: 0,
                feedbackHistory: [],
                status: 'active'
            });
            expect(result.id).to.be.a('string');
        });
    });

    describe("getNextFeedback", () => {
        it("should return feedback for current sentence", async () => {
            setup();
            mockAnthropicClient.messages.create.mockResolvedValue({
                id: 'msg_123',
                content: [{ text: "This is great writing!", type: 'text' }],
                role: 'assistant',
                model: 'claude-3-sonnet-20240229'
            });

            const session = writingTutorService.startFeedbackSession("student1", "This is a test sentence.");
            const result = await writingTutorService.getNextFeedback(session);

            expect(result).to.equal("This is great writing!");
            expect(mockAnthropicClient.messages.create.getCallCount()).to.be.greaterThan(0);
        });

        it("should handle API errors gracefully", async () => {
            setup();
            mockAnthropicClient.messages.create.mockRejectedValue(new Error("API Error"));

            const session = writingTutorService.startFeedbackSession("student1", "This is a test sentence.");
            await expect(writingTutorService.getNextFeedback(session))
                .to.be.rejectedWith("Failed to generate feedback");
        });
    });

    describe("moveToNextSentence", () => {
        it("should increment sentence index", () => {
            setup();
            const session = writingTutorService.startFeedbackSession("student1", "First sentence. Second sentence.");
            writingTutorService.moveToNextSentence(session);

            expect(session.currentSentenceIndex).to.equal(1);
        });

        it("should mark session as completed when reaching end", () => {
            setup();
            const session = writingTutorService.startFeedbackSession("student1", "Single sentence.");
            writingTutorService.moveToNextSentence(session);

            expect(session.status).to.equal('completed');
        });
    });

    describe("respondToFeedback", () => {
        it("should handle student response and return bot reply", async () => {
            setup();
            mockAnthropicClient.messages.create.mockResolvedValue({
                content: [{ text: "Great question!" }]
            });

            const session = writingTutorService.startFeedbackSession("student1", "Test sentence.");
            session.feedbackHistory.push({
                sentenceDiscussed: "Test sentence.",
                feedback: "Initial feedback",
                timestamp: new Date()
            });

            const result = await writingTutorService.respondToFeedback(session, "Student question");

            expect(result).to.equal("Great question!");
            expect(session.feedbackHistory[0].studentResponse).to.equal("Student question");
            expect(session.feedbackHistory[0].botReplyToResponse).to.equal("Great question!");
        });
    });
});
