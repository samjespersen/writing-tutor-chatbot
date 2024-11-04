import { Anthropic } from "npm:@anthropic-ai/sdk";
import { CURRICULUM_DESIGNER_SYSTEM_PROMPT, CURRICULUM_DESIGNER_USER_PROMPT } from "@/src/prompt/prompt.ts";
import { MockAIClient, mockLessonPlanResponse } from "@/src/test/mockAIClient.ts";
import { CONFIG } from "@/src/config.ts";

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
        student_grade: number;
    }) {
        if (this.isMockClient) {
            return mockLessonPlanResponse;
        }

        const userPrompt = CURRICULUM_DESIGNER_USER_PROMPT
            .replace("{{student_text}}", params.student_text)
            .replace("{{student_reflection}}", params.student_reflection)
            .replace("{{student_grade}}", params.student_grade.toString());

        const response: Anthropic.Message = await this.anthropic.beta.promptCaching.messages.create({
            // @ts-ignore: Anthropic types don't properly support system messages in this version
            system: CURRICULUM_DESIGNER_SYSTEM_PROMPT,
            messages: [{ role: "user", content: userPrompt }],
            model: CONFIG.MODEL_NAME,
            max_tokens: 4096,
            temperature: 0.5,
        });

        return response;
    }
}
