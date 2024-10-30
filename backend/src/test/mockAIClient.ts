// deno-lint-ignore-file no-explicit-any
export interface AIClient {
    complete(prompt: string): Promise<string>;
}

export class MockAIClient implements AIClient {
    beta: {
        promptCaching: {
            messages: {
                create: (...args: any[]) => Promise<any>;
            };
        };
    };
    messages: {
        create: MockFunction;
    };

    private calls: string[] = [];
    private mockResponses: Array<{
        response: any;
        isError?: boolean;
    }> = [];

    constructor() {
        const mockFunction = new MockFunction();
        this.messages = {
            create: mockFunction
        };
        this.beta = {
            promptCaching: {
                messages: {
                    create: (...args: any[]) => mockFunction.call(this, ...args)
                }
            }
        };
    }

    setMockResponse(response: any, isError = false) {
        this.mockResponses.push({ response, isError });
    }

    // deno-lint-ignore require-await
    async complete(prompt: string): Promise<string> {
        this.calls.push(prompt);

        if (prompt.includes("feedback")) {
            return "Consider revising this sentence for clarity and conciseness.";
        }

        if (prompt.includes("Student response")) {
            return "Good thinking! Here's how you can improve further...";
        }

        return "Default mock response";
    }

    getCallCount(): number {
        return this.calls.length;
    }

    getLastPrompt(): string {
        return this.calls[this.calls.length - 1];
    }
}

class MockFunction {
    private calls: any[][] = [];
    private mockResponses: Array<{
        response: any;
        isError?: boolean;
    }> = [];

    mockResolvedValue(value: any) {
        this.mockResponses = [{ response: value }];
    }

    mockRejectedValue(error: any) {
        this.mockResponses = [{ response: error, isError: true }];
    }

    call(thisArg: any, ...args: any[]): Promise<any> {
        this.calls.push(args);
        const mockResponse = this.mockResponses[this.calls.length - 1] || this.mockResponses[0];

        if (!mockResponse) {
            return Promise.resolve({});
        }

        if (mockResponse.isError) {
            return Promise.reject(mockResponse.response);
        }

        return Promise.resolve(mockResponse.response);
    }

    toHaveBeenCalledWith(...args: any[]) {
        return JSON.stringify(this.calls[this.calls.length - 1]) === JSON.stringify(args);
    }

    getCallCount(): number {
        return this.calls.length;
    }
}

export const mockLessonPlanResponse = {
    id: 'mock_msg_123',
    content: [{
        type: 'text',
        text: JSON.stringify([{
            pedagogy: "SAFE",
            lessonPlan: {
                objective: "Improve writing clarity",
                commonCoreStandards: ["W.8.1"],
                themes: ["clarity", "structure"],
                activities: [{
                    order: 1,
                    name: "Introduction to Clear Writing",
                    text: "Let's analyze your writing style",
                    theme: "clarity",
                    assessmentCriteria: ["Uses clear language", "Maintains focus"]
                }]
            }
        }])
    }],
    role: 'assistant',
    model: 'claude-3-sonnet-20240229'
};