"use client";
import { useState, useRef } from "react";
import Link from "next/link";
import s from "./notes-generator.module.css";
import NotesOutput from "./NotesOutput";

const AUDIENCES = [
  { value:"School Student", icon:"🎒", desc:"Age 12-17" },
  { value:"College Student", icon:"🎓", desc:"Age 18-24" },
  { value:"Beginner", icon:"🌱", desc:"No Prior Knowledge" },
  { value:"Interview Prep", icon:"💼", desc:"Job Seekers" },
  { value:"Advanced Learner", icon:"🚀", desc:"Expert Level" },
];
const STEPS = ["Researching topic","Building concepts","Writing theory","Generating code","Creating MCQs","Finalizing notes"];

export default function NotesGeneratorPage() {
  const [topic, setTopic] = useState("");
  const [audience, setAudience] = useState("");
  const [loading, setLoading] = useState(false);
  const [stepIdx, setStepIdx] = useState(-1);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [generateMCQs, setGenerateMCQs] = useState(true);
  const [generateMindMap, setGenerateMindMap] = useState(true);
  const outputRef = useRef<HTMLDivElement>(null);

  const canGenerate = topic.trim() && audience;

  const handleGenerate = async () => {
    if (!canGenerate || loading) return;
    setLoading(true); setError(""); setNotes(""); setStepIdx(0);
    const interval = setInterval(() => setStepIdx(i => Math.min(i + 1, STEPS.length - 1)), 2000);
    try {
      const res = await fetch("/api/notes", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ topic, audience, generateMCQs, generateMindMap }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Generation failed. Please try again.");
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
      }
      setTimeout(() => outputRef.current?.scrollIntoView({ behavior:"smooth" }), 100);
    } catch { setError("Network error. Please check your connection."); }
    finally { clearInterval(interval); setLoading(false); setStepIdx(-1); }
  };

  return (
    <div className={s.page}>
      <div className={s.bg1}/><div className={s.bg2}/><div className={s.bg3}/>
      <nav className={s.nav}>
        <Link href="/" className={s.navBack}>← Home</Link>
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
          <div className={s.sectionList}>
            <div className={s.sectionListTitle}>⚙️ Extra Features</div>
            <div style={{ display: "flex", gap: "20px", marginTop: "10px" }}>
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
