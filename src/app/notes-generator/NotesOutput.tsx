"use client";
import { useState, useEffect, useRef } from "react";
import mermaid from "mermaid";
import s from "../video-generator/script-output.module.css"; // Reuse the same output styles

interface Props { notes: string; topic: string; audience: string; onReset: () => void; }

export default function NotesOutput({ notes, topic, audience, onReset }: Props) {
  const [copied, setCopied] = useState(false);
  const [fullScreenContent, setFullScreenContent] = useState<{ type: 'img' | 'mermaid', content: string } | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const handleCopy = () => {
    navigator.clipboard.writeText(notes);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([notes], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${topic.replace(/\s+/g,"-")}-academic-notes.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadPDF = async () => {
    if (!contentRef.current) return;
    const html2pdf = (await import('html2pdf.js')).default;
    const opt = {
      margin:       0.5,
      filename:     `${topic.replace(/\s+/g,"-")}-notes.pdf`,
      image:        { type: 'jpeg' as const, quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true, backgroundColor: '#1a1f2b' }, // Maintain dark mode background
      jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' as const }
    };
    html2pdf().set(opt).from(contentRef.current).save();
  };

  const handleDownloadWord = () => {
    if (!contentRef.current) return;
    const header = "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Export HTML To Doc</title><style>body { font-family: sans-serif; background-color: #1a1f2b; color: #fff; } img { max-width: 100%; }</style></head><body>";
    const footer = "</body></html>";
    const sourceHTML = header + contentRef.current.innerHTML + footer;
    const blob = new Blob(['\ufeff', sourceHTML], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${topic.replace(/\s+/g,"-")}-notes.doc`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Parse sections by "# " headings
  const sections = notes.split(/(?=^# )/m).filter(Boolean);

  return (
    <div className={s.wrap}>
      <div className={s.topBar}>
        <div className={s.topLeft}>
          <div className={s.successDot} />
          <div>
            <div className={s.topTitle}>Academic Notes Generated ✓</div>
            <div className={s.topMeta}>{topic} · {audience}</div>
          </div>
        </div>
        <div className={s.topActions}>
          <button className={s.actionBtn} onClick={handleCopy}>{copied ? "✓ Copied!" : "📋 Copy"}</button>
          <button className={s.actionBtn} onClick={handleDownload}>⬇ .MD</button>
          <button className={s.actionBtn} onClick={handleDownloadPDF}>⬇ PDF</button>
          <button className={s.actionBtn} onClick={handleDownloadWord}>⬇ Word</button>
          <button className={`${s.actionBtn} ${s.resetBtn}`} onClick={onReset}>✕ New Notes</button>
        </div>
      </div>
      <div className={s.content} ref={contentRef}>
        {sections.length > 1 ? sections.map((sec, i) => {
          const lines = sec.trim().split("\n");
          const title = lines[0].replace(/^#+\s*/, "");
          const body = lines.slice(1).join("\n").trim();
          return (
            <div key={i} className={s.section}>
              <h2 className={s.secTitle}>{title}</h2>
              <NotesBody text={body} onImageClick={(url) => setFullScreenContent({ type: 'img', content: url })} onMermaidClick={(chart) => setFullScreenContent({ type: 'mermaid', content: chart })} />
            </div>
          );
        }) : <NotesBody text={notes} onImageClick={(url) => setFullScreenContent({ type: 'img', content: url })} onMermaidClick={(chart) => setFullScreenContent({ type: 'mermaid', content: chart })} />}
      </div>

      {fullScreenContent && (
        <FullScreenModal 
          data={fullScreenContent} 
          onClose={() => setFullScreenContent(null)} 
        />
      )}
    </div>
  );
}

function FullScreenModal({ data, onClose }: { data: { type: 'img' | 'mermaid', content: string }, onClose: () => void }) {
  return (
    <div style={{
      position: "fixed",
      inset: 0,
      backgroundColor: "rgba(0,0,0,0.95)",
      zIndex: 1000,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "40px",
      backdropFilter: "blur(10px)"
    }} onClick={onClose}>
      <button 
        onClick={onClose}
        style={{
          position: "absolute",
          top: "20px",
          right: "20px",
          background: "rgba(255,255,255,0.1)",
          border: "1px solid rgba(255,255,255,0.2)",
          color: "white",
          width: "40px",
          height: "40px",
          borderRadius: "50%",
          cursor: "pointer",
          fontSize: "20px"
        }}
      >✕</button>
      
      <div 
        style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}
        onClick={(e) => e.stopPropagation()}
      >
        {data.type === 'img' ? (
          <img src={data.content} alt="Full Screen" style={{ maxWidth: "100%", maxHeight: "100%", borderRadius: "12px", boxShadow: "0 0 50px rgba(0,0,0,0.5)" }} />
        ) : (
          <div style={{ width: "90%", background: "rgba(255,255,255,0.05)", padding: "40px", borderRadius: "20px" }}>
             <MermaidDiagram chart={data.content} isFullScreen />
          </div>
        )}
      </div>
      <p style={{ color: "#aaa", marginTop: "20px" }}>Click anywhere outside to close</p>
    </div>
  );
}

function NotesBody({ text, onImageClick, onMermaidClick }: { text: string, onImageClick: (url: string) => void, onMermaidClick: (chart: string) => void }) {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }

    // Check for image
    const imgMatch = line.match(/!\[([^\]]*)\]\(([^)]+)\)/);
    if (imgMatch) {
      const url = imgMatch[2];
      elements.push(
        <div key={`img-${i}`} style={{ position: "relative", cursor: "zoom-in", margin: "20px 0" }} onClick={() => onImageClick(url)}>
          <img src={url} alt={imgMatch[1]} style={{ maxWidth: "100%", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.1)" }} />
          <div style={{ position: "absolute", top: "10px", right: "10px", background: "rgba(0,0,0,0.6)", padding: "5px 10px", borderRadius: "8px", fontSize: "12px", color: "white" }}>🔍 Full Screen</div>
        </div>
      );
      i++;
      continue;
    }

    if (line.startsWith("## ")) {
      elements.push(<h3 key={i} className={s.h3} style={{color: '#43e6b5'}}>{line.replace(/^##\s*/, "")}</h3>);
    } else if (line.startsWith("### ")) {
      elements.push(<h4 key={i} className={s.h4} style={{color: '#a29bfe'}}>{line.replace(/^###\s*/, "")}</h4>);
    } else if (line.startsWith("**") && line.endsWith("**") && line.length > 4) {
      elements.push(<p key={i} className={s.bold}>{line.replace(/\*\*/g, "")}</p>);
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      const bullets: string[] = [];
      while (i < lines.length && (lines[i].startsWith("- ") || lines[i].startsWith("* "))) {
        bullets.push(lines[i].replace(/^[-*]\s/, ""));
        i++;
      }
      elements.push(<ul key={`ul-${i}`} className={s.ul}>{bullets.map((b,bi) => <li key={bi} className={s.li} dangerouslySetInnerHTML={{__html: formatInline(b)}}/>)}</ul>);
      continue;
    } else if (/^\d+\.\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s/, ""));
        i++;
      }
      elements.push(<ol key={`ol-${i}`} className={s.ol}>{items.map((b,bi) => <li key={bi} className={s.li} dangerouslySetInnerHTML={{__html: formatInline(b)}}/>)}</ol>);
      continue;
    } else if (line.startsWith("```")) {
      const lang = line.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) { codeLines.push(lines[i]); i++; }
      const codeStr = codeLines.join("\n");
      if (lang === "mermaid") {
        elements.push(<MermaidDiagram key={i} chart={codeStr} onFullScreen={() => onMermaidClick(codeStr)} />);
      } else if (lang === "mcq") {
        elements.push(<InteractiveMCQList key={i} dataStr={codeStr} />);
      } else {
        elements.push(<div key={i} className={s.codeBlock}><div className={s.codeLang}>{lang||"code"}</div><pre className={s.pre}><code>{codeStr}</code></pre></div>);
      }
    } else if (line.startsWith("---")) {
      elements.push(<hr key={i} className={s.hr}/>);
    } else if (line.startsWith("|")) {
      const rows: string[][] = [];
      while (i < lines.length && lines[i].startsWith("|")) {
        if (!lines[i].includes("---")) rows.push(lines[i].split("|").filter(Boolean).map(c => c.trim()));
        i++;
      }
      if (rows.length > 0) elements.push(<div key={`t-${i}`} className={s.tableWrap}><table className={s.table}><thead><tr>{rows[0].map((h,hi) => <th key={hi}>{h}</th>)}</tr></thead><tbody>{rows.slice(1).map((r,ri) => <tr key={ri}>{r.map((c,ci) => <td key={ci}>{c}</td>)}</tr>)}</tbody></table></div>);
      continue;
    } else {
      elements.push(<p key={i} className={s.p} dangerouslySetInnerHTML={{__html: formatInline(line)}}/>);
    }
    i++;
  }

  return <>{elements}</>;
}

function formatInline(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, "<code>$1</code>");
}

mermaid.initialize({ startOnLoad: false, theme: 'dark' });

function MermaidDiagram({ chart, onFullScreen, isFullScreen = false }: { chart: string, onFullScreen?: () => void, isFullScreen?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current) {
      const id = `mermaid-${Math.random().toString(36).substring(7)}`;
      mermaid.render(id, chart).then(({ svg }) => {
        if (ref.current) {
          ref.current.innerHTML = svg;
          const svgElement = ref.current.querySelector('svg');
          if (svgElement) {
            svgElement.style.width = '100%';
            svgElement.style.height = isFullScreen ? '80vh' : 'auto';
            svgElement.style.maxWidth = '100%';
          }
        }
      }).catch((e) => {
        console.error("Mermaid error:", e);
        if (ref.current) ref.current.innerHTML = "<div style='color:red'>Invalid Mermaid diagram</div>";
      });
    }
  }, [chart, isFullScreen]);
  
  return (
    <div style={{ 
      width: "100%", 
      margin: isFullScreen ? "0" : "20px 0", 
      background: "rgba(0,0,0,0.2)", 
      borderRadius: "12px", 
      border: isFullScreen ? "none" : "1px solid rgba(255,255,255,0.05)", 
      display: "flex", 
      flexDirection: "column",
      alignItems: "center", 
      padding: isFullScreen ? "0" : "20px",
      position: "relative"
    }}>
      {!isFullScreen && onFullScreen && (
        <button 
          onClick={onFullScreen}
          style={{
            position: "absolute",
            top: "10px",
            right: "10px",
            background: "rgba(108, 99, 255, 0.2)",
            border: "1px solid #6c63ff",
            color: "#fff",
            padding: "5px 10px",
            borderRadius: "8px",
            fontSize: "12px",
            cursor: "pointer",
            zIndex: 10
          }}
        >🔍 Full Screen</button>
      )}
      <div ref={ref} style={{ width: "100%" }} />
    </div>
  );
}

function InteractiveMCQList({ dataStr }: { dataStr: string }) {
  let questions: any[] = [];
  try {
    questions = JSON.parse(dataStr);
  } catch (e) {
    return <div style={{ color: "red" }}>Failed to parse MCQs.</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px", margin: "20px 0" }}>
      {questions.map((q, idx) => (
        <InteractiveMCQ key={idx} question={q} index={idx + 1} />
      ))}
    </div>
  );
}

function InteractiveMCQ({ question, index }: { question: any, index: number }) {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  const isAnswered = selectedIdx !== null;
  const isCorrect = selectedIdx === question.answerIndex;

  return (
    <div style={{ background: "rgba(255,255,255,0.03)", padding: "20px", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.05)" }}>
      <h4 style={{ fontSize: "1.1rem", color: "#fff", marginBottom: "16px" }}>
        <span style={{ color: "#6c63ff", marginRight: "8px" }}>Q{index}.</span>
        {question.question}
      </h4>
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {question.options.map((opt: string, i: number) => {
          let btnBg = "rgba(255,255,255,0.05)";
          let btnBorder = "1px solid rgba(255,255,255,0.1)";
          let btnColor = "#b0bcc8";

          if (isAnswered) {
            if (i === question.answerIndex) {
              btnBg = "rgba(67, 230, 181, 0.1)";
              btnBorder = "1px solid #43e6b5";
              btnColor = "#43e6b5";
            } else if (i === selectedIdx) {
              btnBg = "rgba(255, 101, 132, 0.1)";
              btnBorder = "1px solid #ff6584";
              btnColor = "#ff6584";
            }
          }

          return (
            <button
              key={i}
              onClick={() => !isAnswered && setSelectedIdx(i)}
              disabled={isAnswered}
              style={{
                textAlign: "left",
                padding: "12px 16px",
                background: btnBg,
                border: btnBorder,
                borderRadius: "8px",
                color: btnColor,
                cursor: isAnswered ? "default" : "pointer",
                fontSize: "0.95rem",
                transition: "all 0.2s"
              }}
            >
              {String.fromCharCode(65 + i)}. {opt}
            </button>
          );
        })}
      </div>
      
      {isAnswered && (
        <div style={{ 
          marginTop: "16px", 
          padding: "12px", 
          borderRadius: "8px", 
          background: isCorrect ? "rgba(67, 230, 181, 0.1)" : "rgba(255, 101, 132, 0.1)",
          borderLeft: `4px solid ${isCorrect ? "#43e6b5" : "#ff6584"}`
        }}>
          <strong style={{ color: isCorrect ? "#43e6b5" : "#ff6584", display: "block", marginBottom: "4px" }}>
            {isCorrect ? "✅ Correct!" : "❌ Incorrect"}
          </strong>
          <span style={{ color: "#d1d5db", fontSize: "0.9rem" }}>{question.explanation}</span>
        </div>
      )}
    </div>
  );
}
