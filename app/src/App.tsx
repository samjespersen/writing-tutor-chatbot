import React, { useState } from "react";

function App() {
    const [studentText, setStudentText] = useState("");
    const [studentReflection, setStudentReflection] = useState("");
    const [studentGrade, setStudentGrade] = useState("");
    const [result, setResult] = useState<any>(null);

    const handleSubmit = async () => {
        try {
            const response = await fetch("http://localhost:3000/api/lesson_planner", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    student_text: studentText,
                    student_reflection: studentReflection,
                    student_grade: studentGrade,
                }),
            });

            const data = await response.json();
            console.log(data)
            setResult(data);
        } catch (error) {
            console.error("Error:", error);
            setResult({ error: "Failed to fetch data" });
        }
    };

    return (
        <div style={{ padding: "20px", maxWidth: "800px", margin: "0 auto" }}>
            <h1>Lesson Planner</h1>

            <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", marginBottom: "5px" }}>
                    Student Text:
                    <textarea
                        value={studentText}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setStudentText(e.target.value)}
                        style={{ width: "100%", minHeight: "100px" }}
                    />
                </label>
            </div>

            <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", marginBottom: "5px" }}>
                    Student Reflection:
                    <textarea
                        value={studentReflection}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setStudentReflection(e.target.value)}
                        style={{ width: "100%", minHeight: "100px" }}
                    />
                </label>
            </div>

            <div style={{ marginBottom: "20px" }}>
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
                Generate Lesson Plan
            </button>

            {result && (
                <div style={{ marginTop: "20px" }}>
                    <h2>Result:</h2>
                    {result.map((plan: any, index: number) => (
                        <div key={index} style={{ marginBottom: "20px", padding: "20px", border: "1px solid #ccc" }}>
                            <h3>Pedagogy: {plan.pedagogy}</h3>
                            <h4>Objective: {plan.lessonPlan.objective}</h4>

                            <div>
                                <h4>Common Core Standards:</h4>
                                <ul>
                                    {plan.lessonPlan.commonCoreStandards.map((standard: string, idx: number) => (
                                        <li key={idx}>{standard}</li>
                                    ))}
                                </ul>
                            </div>

                            <div>
                                <h4>Themes:</h4>
                                <ul>
                                    {plan.lessonPlan.themes.map((theme: string, idx: number) => (
                                        <li key={idx}>{theme}</li>
                                    ))}
                                </ul>
                            </div>

                            <div>
                                <h4>Activities:</h4>
                                {plan.lessonPlan.activities.map((activity: any, idx: number) => (
                                    <div key={idx} style={{ marginBottom: "15px", padding: "10px", backgroundColor: "#f8f9fa" }}>
                                        <h5>Activity {activity.order}: {activity.name}</h5>
                                        <p><strong>Theme:</strong> {activity.theme}</p>
                                        {activity.strategy && <p><strong>Strategy:</strong> {activity.strategy}</p>}
                                        <p><strong>Description:</strong> {activity.text}</p>
                                        {activity.assessmentCriteria && <div>
                                            <strong>Assessment Criteria:</strong>
                                            <ul>
                                                {activity.assessmentCriteria.map((criteria: string, criteriaIdx: number) => (
                                                    <li key={criteriaIdx}>{criteria}</li>
                                                ))}
                                            </ul>
                                        </div>
                                        }
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default App;