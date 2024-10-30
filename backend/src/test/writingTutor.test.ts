import { describe, it, expect, use, chaiAsPromised } from '@/deps.ts';
import { WritingTutorService } from "../services/writingTutor.ts";
import { MockAIClient } from "./mockAIClient.ts";
import { beforeAll } from "https://deno.land/std@0.210.0/testing/bdd.ts";
import { LessonManager } from "../services/lessonManager.ts";

use(chaiAsPromised);

describe("WritingTutorService", () => {
    let mockAnthropicClient: MockAIClient;
    let writingTutorService: WritingTutorService;

    const mockLessonPlans = [{
        pedagogy: 'SAFE' as const,
        lessonPlan: {
            objective: "Test objective",
            commonCoreStandards: ["TEST.1"],
            themes: ["writing"],
            activities: [{
                order: 1,
                name: "Test Activity",
                text: "Activity instructions",
                theme: "writing",
                assessmentCriteria: ["criteria1"]
            }]
        }
    }];

    beforeAll(() => {
        writingTutorService = new WritingTutorService();
        mockAnthropicClient = writingTutorService.anthropic as MockAIClient;
    });

    describe("startFeedbackSession", () => {
        it("should create a new feedback session", () => {
            const result = writingTutorService.startFeedbackSession("student1", "Sample essay text", 8);

            expect(result).to.deep.include({
                studentId: "student1",
                essayText: "Sample essay text",
                studentGrade: 8,
                feedbackHistory: [],
                status: 'awaiting_curriculum'
            });
            expect(result.id).to.be.a('string');
        });
    });

    describe("initializeLessonManager", () => {
        it("should initialize lesson manager and update session status", () => {
            const session = writingTutorService.startFeedbackSession("student1", "Sample essay text", 8);
            writingTutorService.initializeLessonManager(session, mockLessonPlans);

            expect(session.lessonManager).to.be.instanceOf(LessonManager);
            expect(session.status).to.equal('active');
        });
    });

    describe("getNextFeedback", () => {
        it("should return feedback for current activity", async () => {
            mockAnthropicClient.messages.create.mockResolvedValue({
                id: 'msg_123',
                content: [{ text: "Activity feedback", type: 'text' }],
                role: 'assistant',
                model: 'claude-3-sonnet-20240229'
            });

            const session = writingTutorService.startFeedbackSession("student1", "Test text", 8);
            writingTutorService.initializeLessonManager(session, mockLessonPlans);

            const currentState = session.lessonManager!.getCurrentState();
            const result = await writingTutorService.getNextFeedback(session, currentState);

            expect(result).to.equal("Activity feedback");
            expect(session.feedbackHistory).to.have.lengthOf(1);
            expect(session.feedbackHistory[0].activityName).to.equal("Test Activity");
        });

        it("should handle completion state", async () => {
            const session = writingTutorService.startFeedbackSession("student1", "Test text", 8);
            writingTutorService.initializeLessonManager(session, mockLessonPlans);

            // Complete the activity
            session.lessonManager?.recordActivity("test response");

            const currentState = session.lessonManager!.getCurrentState();
            const result = await writingTutorService.getNextFeedback(session, currentState);
            expect(result).to.include("Congratulations");
            expect(session.status).to.equal('completed');
        });
    });

    describe("respondToFeedback", () => {
        it("should handle student response", async () => {
            mockAnthropicClient.messages.create.mockResolvedValue({
                content: [{ text: "Great response!", type: 'text' }]
            });

            const session = writingTutorService.startFeedbackSession("student1", "Test text", 8);
            writingTutorService.initializeLessonManager(session, mockLessonPlans);

            // Add initial feedback
            const currentState = session.lessonManager!.getCurrentState();
            await writingTutorService.getNextFeedback(session, currentState);

            const result = await writingTutorService.respondToFeedback(
                session,
                "Student response",
                currentState
            );

            expect(result).to.equal("Great response!");
            expect(session.feedbackHistory[0].studentResponse).to.equal("Student response");
        });

        it("should throw error if no previous interaction exists", async () => {
            const session = writingTutorService.startFeedbackSession("student1", "Test text", 8);
            writingTutorService.initializeLessonManager(session, mockLessonPlans);
            const currentState = session.lessonManager!.getCurrentState();

            await expect(writingTutorService.respondToFeedback(session, "Response", currentState))
                .to.be.rejectedWith("No previous interaction found");
        });
    });
});

