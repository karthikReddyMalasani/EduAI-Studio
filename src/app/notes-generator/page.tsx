"use client";
import { useState, useRef } from "react";
import Link from "next/link";
import s from "./notes-generator.module.css";
import NotesOutput from "./NotesOutput";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";

const AUDIENCES = [
  { value:"School Student", icon:"🎒", desc:"Age 12-17" },
  { value:"College Student", icon:"🎓", desc:"Age 18-24" },
  { value:"Beginner", icon:"🌱", desc:"No Prior Knowledge" },
  { value:"Interview Prep", icon:"💼", desc:"Job Seekers" },
  { value:"Advanced Learner", icon:"🚀", desc:"Expert Level" },
];

export default function NotesGeneratorPage() {
  const [topic, setTopic] = useState("");
  const [audience, setAudience] = useState("");
  const [loading, setLoading] = useState(false);
  const [stepIdx, setStepIdx] = useState(-1);
  const [generateMCQs, setGenerateMCQs] = useState(true);
  const [generateMindMap, setGenerateMindMap] = useState(true);

  const STEPS = [
    "Overview", "Concepts", 
    ...(generateMindMap ? ["Mindmap"] : []),
    "Theory", "Process", "Examples", "Visuals", "Preparation",
    ...(generateMCQs ? ["MCQs"] : []),
    "Applications", "Revision", "Advanced"
  ];
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [generateMCQs, setGenerateMCQs] = useState(true);
  const [generateMindMap, setGenerateMindMap] = useState(true);
  const [format, setFormat] = useState("detailed"); // "detailed", "simple", "revision"
  const outputRef = useRef<HTMLDivElement>(null);

  const canGenerate = topic.trim() && audience;

  const handleGenerate = async () => {
    if (!canGenerate || loading) return;
    setLoading(true); setError(""); setNotes(""); setStepIdx(0);
    try {
      const res = await fetch("/api/notes", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ topic, audience, generateMCQs, generateMindMap, format }),
      });
      if (!res.ok) {
        let errorMsg = "Generation failed. Please try again.";
        try {
          const contentType = res.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            const data = await res.json();
            errorMsg = data.error || errorMsg;
          } else {
            const text = await res.text();
            // If it's a large HTML page, just show the status and a snippet
            errorMsg = `Server error (${res.status}): ${text.includes("<!DOCTYPE") ? "Received HTML instead of JSON. This usually means a 404 or 500 error." : text.slice(0, 100)}`;
          }
        } catch (e) {
          errorMsg = `Error parsing server response (${res.status})`;
        }
        setError(errorMsg);
        return;
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        setNotes(accumulated);

        // Dynamic step tracking: Look for "# 📖 1.", "# 🧠 2.", etc.
        const match = accumulated.match(/#\s+.*?\s+(\d+)\./g);
        if (match) {
          const lastNum = parseInt(match[match.length - 1].match(/\d+/)![0]);
          setStepIdx(Math.min(lastNum - 1, STEPS.length - 1));
        }
      }

      // Save to History after full generation
      try {
        await fetch(`${API_URL}/api/notes/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: topic,
            subject: "Academic", // Or dynamic if available
            topics: [topic],
            style: format,
            content: accumulated
          })
        });
      } catch (saveErr) {
        console.error("Failed to save to history:", saveErr);
      }

      setTimeout(() => outputRef.current?.scrollIntoView({ behavior:"smooth" }), 100);
    } catch { setError("Network error. Please check your connection."); }
    finally { setLoading(false); setStepIdx(-1); }
  };

  return (
    <div className={s.page}>
      <div className={s.bg1}/><div className={s.bg2}/><div className={s.bg3}/>
      <nav className={s.nav}>
        <Link href="/" className={s.navBack}>← Home</Link>
        <Link href="/history" className={s.navBack} style={{ marginLeft: "10px", borderColor: "#a29bfe", color: "#a29bfe" }}>📜 History</Link>
        <span className={s.navTitle}>Academic Notes Generator</span>
      </nav>
      <header className={s.header}>
        <div className={s.badge}><span className={s.dot}/>16 Sections · AI Generated</div>
        <h1 className={s.heroTitle}><span className={s.grad}>Academic Notes</span><br/>Generator</h1>
        <p className={s.heroSub}>Exam-ready notes with theory, code, MCQs, interview Q&amp;A and roadmaps</p>
        <div className={s.pillRow}>
          {["📝 Exam Prep","💻 Code","🎯 Interviews","❓ MCQs","🗺️ Roadmap","⚡ Revision"].map(p => (
            <span key={p} className={s.pill}>{p}</span>
          ))}
        </div>
      </header>
      <main className={s.main}>
        <div className={s.card}>
          <div className={s.section}>
            <label className={s.label}><span className={s.labelIcon}>📖</span>Topic</label>
            <div className={s.inputWrap}>
              <input id="notes-topic-input" className={s.input} placeholder="e.g. Dynamic Programming, OSI Model, Transformers, SQL Joins..." value={topic} onChange={e => setTopic(e.target.value)} disabled={loading}/>
              {topic && <button className={s.clearBtn} onClick={() => setTopic("")}>✕</button>}
            </div>
          </div>
          <div className={s.section}>
            <label className={s.label}><span className={s.labelIcon}>👥</span>Target Audience</label>
            <div className={s.audGrid}>
              {AUDIENCES.map(a => (
                <button key={a.value} id={`notes-aud-${a.value.replace(/\s+/g,"-").toLowerCase()}`} className={`${s.audCard} ${audience===a.value?s.audCardActive:""}`} onClick={() => setAudience(a.value)} disabled={loading}>
                  <span className={s.audIcon}>{a.icon}</span>
                  <span className={s.audLabel}>{a.value}</span>
                  <span className={s.audDesc}>{a.desc}</span>
                </button>
              ))}
            </div>
          </div>
          <div className={s.section}>
            <label className={s.label}><span className={s.labelIcon}>📝</span>Note Format</label>
            <div className={s.formatGrid} style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px", marginTop: "10px" }}>
              {[
                { id: "detailed", name: "Detailed", icon: "📚", desc: "Textbook style" },
                { id: "simple", name: "Simple", icon: "🌱", desc: "Easy to follow" },
                { id: "revision", name: "Revision", icon: "⚡", desc: "Quick recap" },
              ].map(f => (
                <button 
                  key={f.id} 
                  className={`${s.formatCard} ${format === f.id ? s.formatCardActive : ""}`} 
                  onClick={() => setFormat(f.id)}
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: `1.5px solid ${format === f.id ? "#6c63ff" : "rgba(255,255,255,0.1)"}`,
                    borderRadius: "12px",
                    padding: "12px",
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "all 0.2s"
                  }}
                >
                  <div style={{ fontSize: "1.2rem", marginBottom: "4px" }}>{f.icon}</div>
                  <div style={{ fontSize: "0.85rem", fontWeight: "700", color: "#fff" }}>{f.name}</div>
                  <div style={{ fontSize: "0.7rem", color: "#aaa" }}>{f.desc}</div>
                </button>
              ))}
            </div>
          </div>
          <div className={s.sectionList}>
            <div className={s.sectionListTitle}>⚙️ Extra Features</div>
            <div style={{ display: "flex", gap: "20px", marginTop: "10px", flexWrap: "wrap" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "10px", color: "white", cursor: "pointer", fontSize: "16px" }}>
                <input 
                  type="checkbox" 
                  checked={generateMindMap} 
                  onChange={(e) => setGenerateMindMap(e.target.checked)} 
                  style={{ width: "20px", height: "20px", cursor: "pointer", accentColor: "#6c63ff" }}
                />
                🧠 Include MindMap & Hierarchy
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: "10px", color: "white", cursor: "pointer", fontSize: "16px" }}>
                <input 
                  type="checkbox" 
                  checked={generateMCQs} 
                  onChange={(e) => setGenerateMCQs(e.target.checked)} 
                  style={{ width: "20px", height: "20px", cursor: "pointer", accentColor: "#6c63ff" }}
                />
                ❓ Include MCQs
              </label>
            </div>
          </div>
          {error && <div className={s.errorBox}>⚠️ {error}</div>}
          <button id="generate-notes-btn" className={`${s.genBtn} ${!canGenerate?s.genBtnDisabled:""}`} onClick={handleGenerate} disabled={!canGenerate||loading}>
            {loading
              ? <span className={s.genBtnInner}><span className={s.spinner}/>Generating Notes...</span>
              : <span className={s.genBtnInner}>📚 Generate Comprehensive Notes</span>}
          </button>
          {loading && (
            <div className={s.steps}>
              {STEPS.map((st,i) => (
                <div key={st} className={`${s.step} ${i===stepIdx?s.stepActive:""} ${i<stepIdx?s.stepDone:""}`}>
                  <span className={s.stepDot}/>{st}
                </div>
              ))}
            </div>
          )}
        </div>
        {notes && (
          <div ref={outputRef} className={s.output}>
            <NotesOutput notes={notes} topic={topic} audience={audience} onReset={() => setNotes("")}/>
          </div>
        )}
      </main>
      <footer className={s.footer}>Powered by <span className={s.gradFt}>Groq · LLaMA 3.3</span> · Built for Students</footer>
    </div>
  );
}
