"use client";
import { useState, useRef } from "react";
import Link from "next/link";
import s from "./video-generator.module.css";
import { Player } from "@remotion/player";
import { AlgorithmVideo } from "../../remotion/AlgorithmVideo";
import { GenericVideo } from "../../remotion/GenericVideo";
const MODES = [
  { value:"algorithm", emoji:"⚡", name:"Algorithm Visualizer", hint:"Step-by-step execution, pointer movement, dry run, time complexity" },
  { value:"cinematic", emoji:"🎬", name:"Cinematic Theory", hint:"Diagrams, formulas, real-world analogies, exam-oriented storytelling" },
  { value:"storytelling", emoji:"✨", name:"Anime Storytelling", hint:"Student (Kai) + Mentor (Sensei) characters, story-driven learning" },
  { value:"standard", emoji:"🎓", name:"Standard Script", hint:"Full balanced script with all 10 sections covered in detail" },
];
const AUDIENCES = [
  { value:"School Student", icon:"🎒", desc:"Age 12-17" },
  { value:"College Student", icon:"🎓", desc:"Age 18-24" },
  { value:"Beginner", icon:"🌱", desc:"No Prior Knowledge" },
  { value:"Interview Prep", icon:"💼", desc:"Job Seekers" },
  { value:"Advanced Learner", icon:"🚀", desc:"Expert Level" },
];
const STYLES = [
  { value:"Anime Style", icon:"⚡" },
  { value:"Motion Graphics", icon:"🎨" },
  { value:"Whiteboard", icon:"✏️" },
  { value:"Cinematic", icon:"🎬" },
  { value:"Coding Tutorial", icon:"💻" },
  { value:"Minimal", icon:"◾" },
];
const DURATIONS = [
  { value:"1 min", icon:"⚡", label:"Quick Bite", scenes:"3 scenes" },
  { value:"3 min", icon:"🎯", label:"Focused", scenes:"6 scenes" },
  { value:"5 min", icon:"📚", label:"Standard", scenes:"10 scenes" },
  { value:"10 min", icon:"🎓", label:"Deep Dive", scenes:"14 scenes" },
];
const STEPS = ["Crafting storyline","Designing scenes","Writing narration","Adding effects","Finalizing script"];

export default function VideoGeneratorPage() {
  const [topic, setTopic] = useState("");
  const [mode, setMode] = useState("standard");
  const [audience, setAudience] = useState("");
  const [style, setStyle] = useState("");
  const [duration, setDuration] = useState("");
  const [loading, setLoading] = useState(false);
  const [stepIdx, setStepIdx] = useState(-1);
  const [scriptData, setScriptData] = useState<any>(null);
  const [showCaptions, setShowCaptions] = useState(true);
  const [error, setError] = useState("");
  const [statusLog, setStatusLog] = useState<string[]>([]);
  const outputRef = useRef<HTMLDivElement>(null);

  const addLog = (msg: string) => setStatusLog(prev => [...prev.slice(-4), msg]);

  // WebM Export State
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // MP4 Render State
  const [isRendering, setIsRendering] = useState(false);

  const canGenerate = topic.trim() && audience && style && duration;

  const handleGenerate = async () => {
    if (!canGenerate || loading) return;
    setLoading(true); setError(""); setScriptData(null); setStepIdx(0); setStatusLog(["Initializing engine..."]);
    const interval = setInterval(() => {
      setStepIdx(i => {
        const next = Math.min(i + 1, STEPS.length - 1);
        addLog(STEPS[next]);
        return next;
      });
    }, 1800);
    try {
      const res = await fetch("/api/video-script", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ topic, audience, style, duration, mode }),
      });
      clearInterval(interval);

      if (!res.ok) {
        let errorMsg = "Generation failed. Please try again.";
        try {
          const contentType = res.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            const data = await res.json();
            errorMsg = data.error || errorMsg;
          } else {
            const text = await res.text();
            errorMsg = `Server error (${res.status}): ${text.includes("<!DOCTYPE") ? "Received HTML instead of JSON." : text.slice(0, 100)}`;
          }
        } catch (e) {
          errorMsg = `Error parsing server response (${res.status})`;
        }
        setError(errorMsg);
        return;
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let content = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        content += decoder.decode(value, { stream: true });
        
        // Try to parse partial JSON for "interactive" feel (optional, but complex)
        // For now, we'll just show the raw content in a preview box
      }

      let jsonResult;
      try {
        jsonResult = JSON.parse(content);
      } catch {
        const stripped = content.replace(/```json/g, "").replace(/```/g, "").trim();
        jsonResult = JSON.parse(stripped);
      }

      setScriptData(jsonResult);
      setTimeout(() => outputRef.current?.scrollIntoView({ behavior:"smooth" }), 100);
    } catch { setError("Network error. Please check your connection."); }
    finally { clearInterval(interval); setLoading(false); setStepIdx(-1); }
  };

  const handleExportWebM = async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${topic.replace(/\s+/g,"-") || 'video'}.webm`;
        a.click();
        URL.revokeObjectURL(url);
        setIsRecording(false);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Error capturing WebM:", err);
      alert("Failed to capture screen. Please allow permissions.");
    }
  };

  const handleRenderMP4 = async () => {
    if (!scriptData) return;
    setIsRendering(true);
    try {
      const res = await fetch("/api/render-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scriptData, topic }),
      });
      if (!res.ok) {
        let errorMsg = "Render failed";
        try {
          const contentType = res.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            const data = await res.json();
            errorMsg = data.error || errorMsg;
          } else {
            const text = await res.text();
            errorMsg = `Server error (${res.status}): ${text.includes("<!DOCTYPE") ? "Received HTML instead of JSON." : text.slice(0, 100)}`;
          }
        } catch (e) {
          errorMsg = `Error parsing server response (${res.status})`;
        }
        throw new Error(errorMsg);
      }
      
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${topic.replace(/\s+/g,"-") || 'video'}-hd.mp4`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to render MP4. Ensure local server has FFmpeg.");
    } finally {
      setIsRendering(false);
    }
  };

  return (
    <div className={s.page}>
      <div className={s.bg1}/><div className={s.bg2}/><div className={s.bg3}/>
      <nav className={s.nav}>
        <Link href="/" className={s.navBack}>← Home</Link>
        <Link href="/history" className={s.navBack} style={{ marginLeft: "10px", borderColor: "#a29bfe", color: "#a29bfe" }}>📜 History</Link>
        <span className={s.navTitle}>Video Script Generator</span>
      </nav>
      <header className={s.header}>
        <div className={s.badge}><span className={s.dot}/>AI Powered · Groq LLaMA 3.3</div>
        <h1 className={s.heroTitle}><span className={s.grad}>Animated Video</span><br/>Script Generator</h1>
        <p className={s.heroSub}>Transform any topic into a <span className={s.accent}>production-ready</span> animated video script</p>
      </header>
      <main className={s.main}>
        <div className={s.card}>
          {/* Topic */}
          <div className={s.section}>
            <label className={s.label}><span className={s.labelIcon}>🎯</span>Topic</label>
            <div className={s.inputWrap}>
              <input id="topic-input" className={s.input} placeholder="e.g. Binary Search, Newton's Laws, React Hooks..." value={topic} onChange={e => setTopic(e.target.value)} disabled={loading}/>
              {topic && <button className={s.clearBtn} onClick={() => setTopic("")}>✕</button>}
            </div>
          </div>
          {/* Mode */}
          <div className={s.section}>
            <label className={s.label}><span className={s.labelIcon}>🎭</span>Generation Mode</label>
            <div className={s.modeGrid}>
              {MODES.map(m => (
                <button key={m.value} id={`mode-${m.value}`} className={`${s.modeCard} ${mode===m.value?s.modeCardActive:""}`} onClick={() => setMode(m.value)} disabled={loading}>
                  <span className={s.modeEmoji}>{m.emoji}</span>
                  <span className={s.modeName}>{m.name}</span>
                  <span className={s.modeHint}>{m.hint}</span>
                </button>
              ))}
            </div>
          </div>
          {/* Audience */}
          <div className={s.section}>
            <label className={s.label}><span className={s.labelIcon}>👥</span>Target Audience</label>
            <div className={s.audienceGrid}>
              {AUDIENCES.map(a => (
                <button key={a.value} id={`aud-${a.value.replace(/\s+/g,"-").toLowerCase()}`} className={`${s.audCard} ${audience===a.value?s.audCardActive:""}`} onClick={() => setAudience(a.value)} disabled={loading}>
                  <span className={s.audIcon}>{a.icon}</span>
                  <span className={s.audLabel}>{a.value}</span>
                  <span className={s.audDesc}>{a.desc}</span>
                </button>
              ))}
            </div>
          </div>
          {/* Style */}
          <div className={s.section}>
            <label className={s.label}><span className={s.labelIcon}>🎨</span>Video Style</label>
            <div className={s.styleGrid}>
              {STYLES.map(st => (
                <button key={st.value} id={`style-${st.value.replace(/\s+/g,"-").toLowerCase()}`} className={`${s.styleCard} ${style===st.value?s.styleCardActive:""}`} onClick={() => setStyle(st.value)} disabled={loading}>
                  <span className={s.styleIcon}>{st.icon}</span>
                  <span className={s.styleLabel}>{st.value}</span>
                </button>
              ))}
            </div>
          </div>
          {/* Duration */}
          <div className={s.section}>
            <label className={s.label}><span className={s.labelIcon}>⏱️</span>Duration</label>
            <div className={s.durGrid}>
              {DURATIONS.map(d => (
                <button key={d.value} id={`dur-${d.value.replace(/\s+/g,"-")}`} className={`${s.durCard} ${duration===d.value?s.durCardActive:""}`} onClick={() => setDuration(d.value)} disabled={loading}>
                  <span className={s.durIcon}>{d.icon}</span>
                  <span className={s.durVal}>{d.value}</span>
                  <span className={s.durLabel}>{d.label}</span>
                  <span className={s.durScenes}>{d.scenes}</span>
                </button>
              ))}
            </div>
          </div>
          {error && <div className={s.errorBox}>⚠️ {error}</div>}
          <button id="generate-btn" className={`${s.genBtn} ${!canGenerate?s.genBtnDisabled:""}`} onClick={handleGenerate} disabled={!canGenerate||loading}>
            {loading
              ? <span className={s.genBtnInner}><span className={s.spinner}/>Generating Video...</span>
              : <span className={s.genBtnInner}>🎬 Generate Video</span>}
          </button>
          {loading && (
            <div className={s.stepsContainer}>
              <div className={s.steps}>
                {STEPS.map((st,i) => (
                  <div key={st} className={`${s.step} ${i===stepIdx?s.stepActive:""} ${i<stepIdx?s.stepDone:""}`}>
                    <span className={s.stepDot}/>{st}
                  </div>
                ))}
              </div>
              <div className={s.console}>
                {statusLog.map((log, i) => (
                  <div key={i} className={s.logLine} style={{ opacity: 1 - (statusLog.length - 1 - i) * 0.2 }}>
                    <span style={{ color: "#6c63ff" }}>&gt;</span> {log}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        {scriptData && (
          <div ref={outputRef} className={s.output} style={{ marginTop: "40px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h2 style={{ fontSize: "24px", color: "white", margin: 0 }}>Generated Video</h2>
              <div style={{ display: "flex", gap: "10px" }}>
                <button 
                  onClick={handleExportWebM}
                  style={{
                    background: isRecording ? "rgba(255, 101, 132, 0.2)" : "rgba(67, 230, 181, 0.2)",
                    border: `1px solid ${isRecording ? "#ff6584" : "#43e6b5"}`,
                    color: isRecording ? "#ff6584" : "#43e6b5",
                    padding: "8px 16px",
                    borderRadius: "20px",
                    cursor: "pointer",
                    fontFamily: "inherit",
                    fontWeight: "bold",
                    transition: "all 0.2s"
                  }}
                >
                  {isRecording ? "🛑 Stop Recording" : "⏺️ Export WebM"}
                </button>
                <button 
                  onClick={handleRenderMP4}
                  disabled={isRendering}
                  style={{
                    background: isRendering ? "rgba(255, 255, 255, 0.1)" : "rgba(108, 99, 255, 0.2)",
                    border: `1px solid ${isRendering ? "rgba(255,255,255,0.2)" : "#6c63ff"}`,
                    color: isRendering ? "#ccc" : "#fff",
                    padding: "8px 16px",
                    borderRadius: "20px",
                    cursor: isRendering ? "not-allowed" : "pointer",
                    fontFamily: "inherit",
                    fontWeight: "bold",
                    transition: "all 0.2s"
                  }}
                >
                  {isRendering ? "⏳ Rendering..." : "🎬 Render MP4 (HD)"}
                </button>
                <button 
                  onClick={() => setShowCaptions(!showCaptions)}
                  style={{
                    background: showCaptions ? "rgba(108, 99, 255, 0.2)" : "rgba(255, 255, 255, 0.1)",
                    border: `1px solid ${showCaptions ? "#6c63ff" : "rgba(255,255,255,0.2)"}`,
                    color: showCaptions ? "#6c63ff" : "#fff",
                    padding: "8px 16px",
                    borderRadius: "20px",
                    cursor: "pointer",
                    fontFamily: "inherit",
                    fontWeight: "bold",
                    transition: "all 0.2s"
                  }}
                >
                  {showCaptions ? "👀 Hide Captions" : "💬 Show Captions"}
                </button>
                <button 
                  onClick={() => setScriptData(null)}
                  style={{
                    background: "rgba(255, 255, 255, 0.05)",
                    border: "1px solid rgba(255,255,255,0.2)",
                    color: "#aaa",
                    padding: "8px 16px",
                    borderRadius: "20px",
                    cursor: "pointer",
                    fontFamily: "inherit",
                    fontWeight: "bold",
                    transition: "all 0.2s"
                  }}
                >
                  🔄 New Video
                </button>
              </div>
            </div>
            <div style={{ borderRadius: "12px", overflow: "hidden", border: "1px solid rgba(255,255,255,0.1)", boxShadow: "0 20px 50px rgba(0,0,0,0.5)" }}>
              {scriptData.videoType === "generic" && scriptData.scenes ? (
                <Player
                  component={GenericVideo}
                  inputProps={{
                    title: scriptData.title || topic,
                    scenes: scriptData.scenes || [],
                    showCaptions,
                  }}
                  durationInFrames={scriptData.scenes.reduce((acc: number, s: any) => acc + (s.durationInFrames || 150), 0) + 30}
                  compositionWidth={1920}
                  compositionHeight={1080}
                  fps={30}
                  style={{ width: "100%", aspectRatio: "16/9" }}
                  controls
                  autoPlay
                  loop
                />
              ) : scriptData.videoType === "algorithm" && scriptData.steps ? (
                <Player
                  component={AlgorithmVideo}
                  inputProps={{
                    title: scriptData.title || topic,
                    array: scriptData.array || [],
                    steps: scriptData.steps || [],
                    showCaptions,
                  }}
                  durationInFrames={scriptData.steps.reduce((acc: number, s: any) => acc + (s.durationInFrames || 90), 0) + 30}
                  compositionWidth={1920}
                  compositionHeight={1080}
                  fps={30}
                  style={{ width: "100%", aspectRatio: "16/9" }}
                  controls
                  autoPlay
                  loop
                />
              ) : (
                <div style={{ padding: "40px", color: "white", textAlign: "center" }}>
                  Invalid video data generated. Please try again.
                </div>
              )}
            </div>

            {/* Export & Tips Guide */}
            <div className={s.guideGrid} style={{ marginTop: "40px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
              <div className={s.guideCard} style={{ background: "rgba(255,255,255,0.03)", padding: "24px", borderRadius: "16px", border: "1px solid rgba(255,255,255,0.1)" }}>
                <h3 style={{ color: "#43e6b5", marginBottom: "15px", fontSize: "18px" }}>🚀 Pro Tip: Flawless Export</h3>
                <p style={{ color: "#aaa", fontSize: "14px", lineHeight: "1.6" }}>
                  For the most reliable HD export without server-side errors, use <strong>Export WebM</strong>. 
                  When the browser prompt appears, select <b>"This Tab"</b> and check <b>"Also share tab audio"</b> to capture the full experience.
                </p>
              </div>
              <div className={s.guideCard} style={{ background: "rgba(255,255,255,0.03)", padding: "24px", borderRadius: "16px", border: "1px solid rgba(255,255,255,0.1)" }}>
                <h3 style={{ color: "#6c63ff", marginBottom: "15px", fontSize: "18px" }}>🎬 Content Guide</h3>
                <p style={{ color: "#aaa", fontSize: "14px", lineHeight: "1.6" }}>
                  The AI has automatically calculated scene durations to match your topic complexity. 
                  Toggle captions to check the script accuracy before final recording.
                </p>
              </div>
            </div>

          </div>
        )}
      </main>
      <footer className={s.footer}>Powered by <span className={s.gradFt}>Remotion · LLaMA 3.3</span> · Built for Educators</footer>
    </div>
  );
}
