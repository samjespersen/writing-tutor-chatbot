import React, { useState, useRef, useEffect } from "react";
import './App.css';


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

// Add this new interface near the top with other interfaces
interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
    isTyping?: boolean;
}

// Add this new helper function
const typeMessage = (message: string, setChat: React.Dispatch<React.SetStateAction<ChatMessage[]>>) => {
    const words = message.split(' ');
    let currentIndex = 0;

    const addNextChunk = () => {
        if (currentIndex >= words.length) return;

        // Take 2-4 words at a time randomly
        const chunkSize = Math.floor(Math.random() * 4) + 3;
        const chunk = words.slice(currentIndex, currentIndex + chunkSize).join(' ') + ' ';

        setChat(prev => {
            const newHistory = [...prev];
            const lastMessage = newHistory[newHistory.length - 1];
            if (lastMessage.isTyping) {
                lastMessage.content = words.slice(0, currentIndex + chunkSize).join(' ');
            }
            return newHistory;
        });

        currentIndex += chunkSize;

        if (currentIndex < words.length) {
            // Random delay between 50-150ms between chunks
            setTimeout(addNextChunk, Math.random() * 75 + 50);
        } else {
            // Remove typing status when complete
            setTimeout(() => {
                setChat(prev => prev.map((msg, idx) =>
                    idx === prev.length - 1 ? { ...msg, isTyping: false } : msg
                ));
            }, 100);
        }
    };

    addNextChunk();
};


function App() {
    const [studentText, setStudentText] = useState("");
    const [studentReflection, setStudentReflection] = useState("");
    const [studentGrade, setStudentGrade] = useState("");
    const [result, setResult] = useState<ResultState>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [activeTab, setActiveTab] = useState<'chat' | 'plan'>('chat');
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
    const [chatInput, setChatInput] = useState("");
    const [isLessonStarted, setIsLessonStarted] = useState(false);
    const [inputsCollapsed, setInputsCollapsed] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const chatContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [chatHistory]);

    const handleSubmit = async () => {
        setIsLoading(true);
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
        } finally {
            setIsLoading(false);
        }
    };

    const handleStartLesson = async () => {
        if (!session?.id) return;

        setIsLoading(true);
        try {
            const response = await fetch(`http://localhost:3000/api/sessions/${session.id}/feedback`);
            const data = await response.json();

            if ('error' in data) {
                setResult([{ error: data.error }]);
                return;
            }

            setChatHistory(prev => [...prev, { role: 'assistant', content: '', isTyping: true }]);
            typeMessage(data.feedback, setChatHistory);

            setIsLessonStarted(true);
        } catch (error) {
            setResult([{ error: error instanceof Error ? error.message : 'An unknown error occurred' }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSendChat = async () => {
        if (!session?.id || !chatInput.trim()) return;

        const userMessage = chatInput.trim();
        setChatInput("");
        setChatHistory(prev => [...prev, { role: 'user', content: userMessage }]);

        setIsLoading(true);

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

            setChatHistory(prev => [...prev, { role: 'assistant', content: '', isTyping: true }]);
            typeMessage(data.reply, setChatHistory);

        } catch (error) {
            setResult([{ error: error instanceof Error ? error.message : 'An unknown error occurred' }]);
        } finally {
            setIsLoading(false);
        }
    };

    // Add this validation function
    const isFormValid = () => {
        return studentText.trim() !== "" &&
            studentReflection.trim() !== "" &&
            studentGrade.trim() !== "";
    };

    return (
        <div className="container">
            <h1>Writing Tutor Chatbot</h1>

            <div style={{ marginBottom: "20px" }}>
                {session && (
                    <button
                        onClick={() => setInputsCollapsed(!inputsCollapsed)}
                        className="collapse-button"
                    >
                        {inputsCollapsed ? "▶" : "▼"} Student Information
                    </button>
                )}

                <div style={{ display: session && inputsCollapsed ? "none" : "block" }}>
                    <label className="input-label">
                        Student Text:
                        <textarea
                            value={studentText}
                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setStudentText(e.target.value)}
                            className="text-input"
                            readOnly={!!session}
                        />
                    </label>

                    <label className="input-label">
                        Student Reflection:
                        <textarea
                            value={studentReflection}
                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setStudentReflection(e.target.value)}
                            className="text-input"
                            readOnly={!!session}
                        />
                    </label>


                    <select
                        value={studentGrade}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setStudentGrade(e.target.value)}
                        style={{ width: "20%" }}
                        disabled={!!session}
                    >
                        <option value="">Select Grade</option>
                        {Array.from({ length: 7 }, (_, i) => i + 6).map(grade => (
                            <option key={grade} value={grade}>
                                {grade}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {!session && (
                <button
                    onClick={handleSubmit}
                    disabled={isLoading || !isFormValid()}
                    className="primary-button"
                >
                    {isLoading ? (
                        <div className="button-spinner" />
                    ) : (
                        "Start Session"
                    )}
                </button>
            )}

            {session && (
                <div style={{ marginTop: "20px" }}>
                    <div style={{ borderBottom: "1px solid #ccc", marginBottom: "20px" }}>
                        <button
                            onClick={() => setActiveTab('chat')}
                            className={`tab-button ${activeTab === 'chat' ? 'active' : 'inactive'}`}
                        >
                            Chat
                        </button>
                        <button
                            onClick={() => setActiveTab('plan')}
                            className={`tab-button ${activeTab === 'plan' ? 'active' : 'inactive'}`}
                        >
                            Lesson Plan
                        </button>
                    </div>

                    {activeTab === 'chat' && (
                        <div>
                            <div className="chat-container" ref={chatContainerRef}>
                                {chatHistory.map((msg, idx) => (
                                    <div
                                        key={idx}
                                        className={`chat-message ${msg.role}`}
                                    >
                                        <div className={`message-bubble ${msg.role}`}>
                                            {msg.isTyping ? (
                                                <span className="typing-text">{msg.content}</span>
                                            ) : (
                                                msg.content
                                            )}
                                        </div>
                                    </div>
                                ))}
                                {isLoading && (
                                    <div className="chat-message assistant">
                                        <div className="message-bubble assistant">
                                            <div className="typing-indicator">
                                                <span></span>
                                                <span></span>
                                                <span></span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {!isLessonStarted ? (
                                <button
                                    onClick={handleStartLesson}
                                    disabled={isLoading}
                                    className="send-button"
                                >
                                    {isLoading ? (
                                        <div className="button-spinner" />
                                    ) : (
                                        "Begin lesson"
                                    )}
                                </button>
                            ) : (
                                <div>
                                    <textarea
                                        value={chatInput}
                                        onChange={(e) => setChatInput(e.target.value)}
                                        className="chat-input"
                                    />
                                    <button
                                        onClick={handleSendChat}
                                        className="send-button"
                                    >
                                        Send chat
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'plan' && result && (
                        <div className="lesson-plan">
                            {Array.isArray(result) ? (
                                result.map((plan, index) => (
                                    <div key={index} className="lesson-card">
                                        <h4>Objective: {plan.lessonPlan.objective}</h4>

                                        <div>
                                            <h4>Activities:</h4>
                                            {plan.lessonPlan.activities.map((activity, idx) => (
                                                <div key={idx} className="activity-card">
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