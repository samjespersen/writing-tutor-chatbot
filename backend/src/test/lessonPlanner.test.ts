import { describe, it, expect, use, chaiAsPromised } from '@/deps.ts';
import { LessonPlanner } from "../services/lessonPlanner.ts";
import { beforeAll } from "https://deno.land/std@0.210.0/testing/bdd.ts";

use(chaiAsPromised);

describe("LessonPlanner", () => {
    let lessonPlanner: LessonPlanner;

    beforeAll(() => {
        lessonPlanner = new LessonPlanner();
    });

    describe("generateCurriculum", () => {
        it("should return mock response when using mock client", async () => {
            lessonPlanner = new LessonPlanner(); // This will use mock client by default

            const params = {
                student_text: "Sample writing",
                student_reflection: "My thoughts on writing",
                student_grade: 8
            };

            const expectedMockResponse = {
                id: 'mock_msg_123',
                content: [{ text: "Mocked curriculum response", type: 'text' }],
                role: 'assistant',
                model: 'claude-3-sonnet-20240229'
            };

            const result = await lessonPlanner.generateCurriculum(params);
            expect(result).to.deep.equal(expectedMockResponse);
        });
    });
});