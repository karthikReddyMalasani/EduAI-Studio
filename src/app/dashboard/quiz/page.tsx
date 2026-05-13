"use client";
import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import s from "../dashboard.module.css";

interface MCQ {
  question: string;
  options: string[];
  answerIndex: number;
  explanation: string;
}

export default function RAGQuizPage() {
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const [quizzes, setQuizzes] = useState<MCQ[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedOpt, setSelectedOpt] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);

  const startQuiz = async () => {
    setLoading(true);
    setQuizzes([]);
    setShowResult(false);
    setScore(0);
    setCurrentIdx(0);
    
    try {
      const res = await fetch("http://localhost:8002/generate/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: topic, stream: "Academic" }),
      });
      const data = await res.json();
      const parsed = JSON.parse(data.quiz.replace(/```json/g, "").replace(/```/g, ""));
      setQuizzes(parsed);
    } catch (err) {
      alert("Failed to generate RAG quiz. Check backend.");
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = (idx: number) => {
    setSelectedOpt(idx);
    if (idx === quizzes[currentIdx].answerIndex) setScore(s => s + 1);
    
    setTimeout(() => {
      if (currentIdx < quizzes.length - 1) {
        setCurrentIdx(c => c + 1);
        setSelectedOpt(null);
      } else {
        setShowResult(true);
      }
    }, 1500);
  };

  return (
    <div className={s.page} style={{ padding: "80px 20px", display: "flex", justifyContent: "center" }}>
      <div style={{ maxWidth: "700px", width: "100%" }}>
        <Link href="/dashboard" style={{ color: "var(--primary2)", fontWeight: "bold", display: "block", marginBottom: "40px" }}>← Dashboard</Link>
        
        <h1 className="text-grad" style={{ fontSize: "2.5rem", fontWeight: 900, marginBottom: "10px" }}>Adaptive RAG Quiz</h1>
        <p style={{ color: "var(--text2)", marginBottom: "40px" }}>Testing your knowledge strictly based on indexed course material.</p>

        {!quizzes.length && !loading && (
          <div className="glass" style={{ padding: "40px" }}>
            <input 
              type="text" 
              className={s.searchBar} 
              placeholder="Enter topic from your uploaded syllabus..."
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              style={{ marginBottom: "20px" }}
            />
            <button className={s.chipActive} style={{ width: "100%", padding: "16px", borderRadius: "12px", border: "none", color: "#fff", fontWeight: "bold" }} onClick={startQuiz}>
              Generate RAG Quiz
            </button>
          </div>
        )}

        {loading && <div style={{ textAlign: "center", color: "var(--primary2)", padding: "40px" }}>⏳ Reading documents and crafting questions...</div>}

        {quizzes.length > 0 && !showResult && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass" style={{ padding: "40px" }}>
            <div style={{ fontSize: "0.8rem", color: "var(--text2)", marginBottom: "10px" }}>Question {currentIdx + 1} of {quizzes.length}</div>
            <h2 style={{ fontSize: "1.4rem", marginBottom: "30px", lineHeight: 1.4 }}>{quizzes[currentIdx].question}</h2>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {quizzes[currentIdx].options.map((opt, i) => (
                <button 
                  key={i}
                  className={s.chip}
                  style={{ 
                    textAlign: "left", padding: "16px", borderRadius: "12px", 
                    borderColor: selectedOpt === i ? (i === quizzes[currentIdx].answerIndex ? "var(--accent2)" : "var(--accent)") : "var(--border)",
                    background: selectedOpt === i ? (i === quizzes[currentIdx].answerIndex ? "rgba(67,230,181,0.1)" : "rgba(255,101,132,0.1)") : "var(--surface)"
                  }}
                  onClick={() => selectedOpt === null && handleAnswer(i)}
                >
                  {opt}
                </button>
              ))}
            </div>
            
            {selectedOpt !== null && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ marginTop: "20px", color: "var(--text2)", fontSize: "0.9rem", fontStyle: "italic" }}>
                {quizzes[currentIdx].explanation}
              </motion.div>
            )}
          </motion.div>
        )}

        {showResult && (
          <div className="glass" style={{ padding: "40px", textAlign: "center" }}>
            <h2 style={{ fontSize: "2rem", marginBottom: "10px" }}>Quiz Complete!</h2>
            <div style={{ fontSize: "3rem", fontWeight: 900, color: "var(--primary2)", marginBottom: "20px" }}>{score} / {quizzes.length}</div>
            <p style={{ color: "var(--text2)", marginBottom: "30px" }}>Great job! You are mastering your course material.</p>
            <button className={s.chipActive} style={{ padding: "12px 24px" }} onClick={() => setQuizzes([])}>Try Another Topic</button>
          </div>
        )}
      </div>
    </div>
  );
}
