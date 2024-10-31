import React, { useState } from "react";
import type { LessonPlannerResponse, ErrorResponse } from "../../backend/src/types";

// Define the structure of a lesson plan
interface LessonPlan {
    pedagogy: 'SAFE' | 'MPR';
    lessonPlan: {
        objective: string;
        commonCoreStandards: string[];
        themes: string[];
        activities: Array<{
            order: number;
            name: string;
            text: string;
            theme: string;
            strategy?: string;
            assessmentCriteria?: string[];
        }>;
    };
}

// Define the structure of the parsed response
interface ParsedResponse {
    lessonPlans: LessonPlan[];
}

// Define possible result states
type ResultState = LessonPlan[] | { error: string }[] | null;

// Add new interfaces for session state
interface Session {
    id: string;
    welcomeMessage?: string;
}

function App() {
    const [studentText, setStudentText] = useState("");
    const [studentReflection, setStudentReflection] = useState("");
    const [studentGrade, setStudentGrade] = useState("");
    const [result, setResult] = useState<ResultState>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [activeTab, setActiveTab] = useState<'chat' | 'plan'>('chat');
    const [chatHistory, setChatHistory] = useState<Array<{ role: 'user' | 'assistant', content: string }>>([]);
    const [chatInput, setChatInput] = useState("");
    const [isLessonStarted, setIsLessonStarted] = useState(false);
    const [inputsCollapsed, setInputsCollapsed] = useState(false);

    const handleSubmit = async () => {
        try {
            const response = await fetch("http://localhost:3000/api/sessions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    studentId: "test-student",
                    essayText: studentText,
                    studentGrade: Number(studentGrade),
                    student_reflection: studentReflection
                }),
            });

            const data = await response.json();

            if ('error' in data) {
                setResult([{ error: data.error }]);
                return;
            }
            console.log(data);
            if (data.curriculum) {
                setResult(data.curriculum);
            }

            setSession(data);
            if (data.welcomeMessage) {
                setChatHistory([{ role: 'assistant', content: data.welcomeMessage }]);
            }

            setInputsCollapsed(true);
        } catch (error) {
            setResult([{ error: error instanceof Error ? error.message : 'An unknown error occurred' }]);
        }
    };

    const handleStartLesson = async () => {
        if (!session?.id) return;

        try {
            const response = await fetch(`http://localhost:3000/api/sessions/${session.id}/feedback`);
            const data = await response.json();

            if ('error' in data) {
                setResult([{ error: data.error }]);
                return;
            }

            setChatHistory(prev => [...prev, { role: 'assistant', content: data.feedback }]);
            setIsLessonStarted(true);
        } catch (error) {
            setResult([{ error: error instanceof Error ? error.message : 'An unknown error occurred' }]);
        }
    };

    const handleSendChat = async () => {
        if (!session?.id || !chatInput.trim()) return;

        const userMessage = chatInput.trim();
        setChatInput("");
        setChatHistory(prev => [...prev, { role: 'user', content: userMessage }]);

        try {
            const response = await fetch(`http://localhost:3000/api/sessions/${session.id}/respond`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    response: userMessage
                }),
            });

            const data = await response.json();

            if ('error' in data) {
                setResult([{ error: data.error }]);
                return;
            }

            setChatHistory(prev => [...prev, { role: 'assistant', content: data.reply }]);
        } catch (error) {
            setResult([{ error: error instanceof Error ? error.message : 'An unknown error occurred' }]);
        }
    };

    return (
        <div style={{ padding: "20px", maxWidth: "800px", margin: "0 auto" }}>
            <h1>Writing Tutor Chatbot</h1>

            <div style={{ marginBottom: "20px" }}>
                {session && (
                    <button
                        onClick={() => setInputsCollapsed(!inputsCollapsed)}
                        style={{
                            padding: "5px 10px",
                            backgroundColor: "#f8f9fa",
                            border: "1px solid #ccc",
                            borderRadius: "5px",
                            marginBottom: "10px",
                            cursor: "pointer",
                            width: "100%",
                            textAlign: "left"
                        }}
                    >
                        {inputsCollapsed ? "▶" : "▼"} Student Information
                    </button>
                )}
                
                <div style={{ display: session && inputsCollapsed ? "none" : "block" }}>
                    <label style={{ display: "block", marginBottom: "5px" }}>
                        Student Text:
                        <textarea
                            value={studentText}
                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setStudentText(e.target.value)}
                            style={{ width: "100%", minHeight: "100px" }}
                        />
                    </label>

                    <label style={{ display: "block", marginBottom: "5px" }}>
                        Student Reflection:
                        <textarea
                            value={studentReflection}
                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setStudentReflection(e.target.value)}
                            style={{ width: "100%", minHeight: "100px" }}
                        />
                    </label>

                    <label style={{ display: "block", marginBottom: "5px" }}>
                        Student Grade:
                        <input
                            type="text"
                            value={studentGrade}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setStudentGrade(e.target.value)}
                            style={{ width: "100%" }}
                        />
                    </label>
                </div>
            </div>

            {!session && (
                <button
                    onClick={handleSubmit}
                    style={{
                        padding: "10px 20px",
                        backgroundColor: "#007bff",
                        color: "white",
                        border: "none",
                        borderRadius: "5px",
                        cursor: "pointer",
                    }}
                >
                    Start Session
                </button>
            )}

            {session && (
                <div style={{ marginTop: "20px" }}>
                    <div style={{ borderBottom: "1px solid #ccc", marginBottom: "20px" }}>
                        <button
                            onClick={() => setActiveTab('chat')}
                            style={{
                                padding: "10px 20px",
                                backgroundColor: activeTab === 'chat' ? "#007bff" : "#f8f9fa",
                                color: activeTab === 'chat' ? "white" : "black",
                                border: "none",
                                borderRadius: "5px 5px 0 0",
                                marginRight: "10px",
                            }}
                        >
                            Chat
                        </button>
                        <button
                            onClick={() => setActiveTab('plan')}
                            style={{
                                padding: "10px 20px",
                                backgroundColor: activeTab === 'plan' ? "#007bff" : "#f8f9fa",
                                color: activeTab === 'plan' ? "white" : "black",
                                border: "none",
                                borderRadius: "5px 5px 0 0",
                            }}
                        >
                            Lesson Plan
                        </button>
                    </div>

                    {activeTab === 'chat' && (
                        <div>
                            <div style={{
                                border: "1px solid #ccc",
                                borderRadius: "5px",
                                padding: "20px",
                                marginBottom: "20px",
                                maxHeight: "400px",
                                overflowY: "auto"
                            }}>
                                {chatHistory.map((msg, idx) => (
                                    <div
                                        key={idx}
                                        style={{
                                            marginBottom: "10px",
                                            textAlign: msg.role === 'user' ? 'right' : 'left'
                                        }}
                                    >
                                        <div style={{
                                            display: "inline-block",
                                            padding: "8px 12px",
                                            borderRadius: "15px",
                                            backgroundColor: msg.role === 'user' ? "#007bff" : "#f8f9fa",
                                            color: msg.role === 'user' ? "white" : "black",
                                            maxWidth: "70%",
                                            whiteSpace: "pre-wrap"
                                        }}>
                                            {msg.content}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {!isLessonStarted ? (
                                <button
                                    onClick={handleStartLesson}
                                    style={{
                                        padding: "10px 20px",
                                        backgroundColor: "#28a745",
                                        color: "white",
                                        border: "none",
                                        borderRadius: "5px",
                                        cursor: "pointer",
                                        width: "100%"
                                    }}
                                >
                                    Begin lesson
                                </button>
                            ) : (
                                <div>
                                    <textarea
                                        value={chatInput}
                                        onChange={(e) => setChatInput(e.target.value)}
                                        style={{
                                            width: "100%",
                                            minHeight: "100px",
                                            marginBottom: "10px",
                                            padding: "10px",
                                            borderRadius: "5px",
                                            border: "1px solid #ccc"
                                        }}
                                    />
                                    <button
                                        onClick={handleSendChat}
                                        style={{
                                            padding: "10px 20px",
                                            backgroundColor: "#28a745",
                                            color: "white",
                                            border: "none",
                                            borderRadius: "5px",
                                            cursor: "pointer",
                                            width: "100%"
                                        }}
                                    >
                                        Send chat
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'plan' && result && (
                        <div style={{ marginTop: "20px" }}>
                            {Array.isArray(result) ? (
                                result.map((plan, index) => (
                                    <div key={index} style={{ marginBottom: "20px", padding: "20px", border: "1px solid #ccc" }}>
                                        <h4>Objective: {plan.lessonPlan.objective}</h4>

                                        <div>
                                            <h4>Activities:</h4>
                                            {plan.lessonPlan.activities.map((activity, idx) => (
                                                <div key={idx} style={{ marginBottom: "15px", padding: "10px", backgroundColor: "#f8f9fa" }}>
                                                    <h5>Activity {activity.order}: {activity.name}</h5>
                                                    <p>{activity.text}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div>No lesson plan available</div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default App;