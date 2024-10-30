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

            const params = {
                student_text: "Sample writing",
                student_reflection: "My thoughts on writing",
                student_grade: 8
            };

            const result = await lessonPlanner.generateCurriculum(params);
            expect(result.content[0].type).to.equal('text');
        });

        it("should format curriculum response correctly", async () => {

            const params = {
                student_text: "Sample writing",
                student_reflection: "My thoughts on writing",
                student_grade: 8
            };
            const result = await lessonPlanner.generateCurriculum(params);

            const parsedContent = JSON.parse((result.content[0] as { text: string }).text);

            expect(parsedContent).to.be.an('array');
            expect(parsedContent[0]).to.have.property('pedagogy');
            expect(parsedContent[0].lessonPlan).to.have.property('activities');
        });
    });
});