// deno-lint-ignore-file no-explicit-any
export interface AIClient {
    complete(prompt: string): Promise<string>;
}

export class MockAIClient implements AIClient {
    messages: {
        create: MockFunction;
    };

    private calls: string[] = [];
    private mockResponses: Array<{
        response: any;
        isError?: boolean;
    }> = [];

    constructor() {
        this.messages = {
            create: new MockFunction()
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

    call(...args: any[]): Promise<any> {
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