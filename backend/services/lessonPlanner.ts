import { Anthropic } from "npm:@anthropic-ai/sdk";
import { CURRICULUM_DESIGNER_SYSTEM_PROMPT, CURRICULUM_DESIGNER_USER_PROMPT } from "@/prompt/prompt.ts";
import { MockAIClient } from "@/test/mockAIClient.ts";

export class LessonPlanner {
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

    async generateCurriculum(params: {
        student_text: string;
        student_reflection: string;
        grade: number;
    }) {
        const userPrompt = CURRICULUM_DESIGNER_USER_PROMPT
            .replace("{{student_text}}", params.student_text)
            .replace("{{student_reflection}}", params.student_reflection)
            .replace("{{grade}}", params.grade.toString());

        const response: Anthropic.Message = await this.anthropic.beta.promptCaching.messages.create({
            system: CURRICULUM_DESIGNER_SYSTEM_PROMPT,
            messages: [{ role: "user", content: userPrompt }],
            model: "claude-3-5-sonnet-20241022",
            max_tokens: 4096,
            temperature: 0.5,
        });

        return response;
    }
}
