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
              <NotesBody text={body} topic={topic} onImageClick={(url) => setFullScreenContent({ type: 'img', content: url })} onMermaidClick={(chart) => setFullScreenContent({ type: 'mermaid', content: chart })} />
            </div>
          );
        }) : <NotesBody text={notes} topic={topic} onImageClick={(url) => setFullScreenContent({ type: 'img', content: url })} onMermaidClick={(chart) => setFullScreenContent({ type: 'mermaid', content: chart })} />}
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

function NotesBody({ text, topic, onImageClick, onMermaidClick }: { text: string, topic: string, onImageClick: (url: string) => void, onMermaidClick: (chart: string) => void }) {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }


    if (line.startsWith("# ") || line.startsWith("## ")) {
      const headingText = line.replace(/^[#\s]*/, "");
      elements.push(<h3 key={i} className={s.h3} style={{color: '#43e6b5', fontSize: line.startsWith("# ") ? '1.4rem' : '1.1rem'}}>{headingText}</h3>);
      
      // Safety Net Injection immediately after Visual Learning heading if no image follows
      if (headingText.toUpperCase().includes("VISUAL LEARNING")) {
        const nextLine = lines[i+1] || "";
        if (!nextLine.includes("![")) {
          const topicPrompt = encodeURIComponent(topic);
          const finalUrl = `https://pollinations.ai/p/Highly%20detailed%20educational%20diagram%20of%20${topicPrompt}?width=800&height=400&nologo=true`;
          elements.push(
            <div key={`safety-${i}`} className={s.imgContainer} onClick={() => onImageClick(finalUrl)}>
              <div className={s.imgHeader}>
                 <span className={s.imgTitle}>Generated Topic Illustration</span>
                 <button className={s.fullScreenBtn}>🔍 Full Screen</button>
              </div>
              <img 
                src={finalUrl} 
                alt={topic} 
                className={s.genImg} 
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = `data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' width='800' height='400' viewBox='0 0 800 400'%3e%3crect width='100%25' height='100%25' fill='%231a1a2e'/%3e%3ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='24' fill='%2343e6b5'%3e${encodeURIComponent(topic)} (Diagram)%3c/text%3e%3c/svg%3e`;
                  target.onerror = null;
                }}
              />
            </div>
          );
        }
      }
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
    } else if (line.includes("![")) {
      const imgRegex = /!\[(.*?)\]\s*\((.*?)\)/g;
      let match;
      let lastIdx = 0;
      const parts = [];

      while ((match = imgRegex.exec(line)) !== null) {
        const textBefore = line.substring(lastIdx, match.index).trim();
        if (textBefore) parts.push(<p key={`p-${lastIdx}`} className={s.p} dangerouslySetInnerHTML={{__html: formatInline(textBefore)}}/>);
        
        const [, alt, url] = match;
        const finalUrl = url.includes("pollinations.ai") ? url.replace(/\s/g, "%20") : url;
        console.log("Rendering Image:", finalUrl);
        parts.push(
          <div key={`img-${match.index}`} className={s.imgContainer} onClick={() => onImageClick(finalUrl)}>
            <div className={s.imgHeader}>
               <span className={s.imgTitle}>{alt}</span>
               <button className={s.fullScreenBtn}>🔍 Full Screen</button>
            </div>
            <img 
              src={finalUrl} 
              alt={alt} 
              className={s.genImg} 
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                const parent = target.parentElement;
                if (parent) {
                  const fallback = document.createElement('div');
                  fallback.style.width = '100%';
                  fallback.style.height = '300px';
                  fallback.style.display = 'flex';
                  fallback.style.alignItems = 'center';
                  fallback.style.justifyContent = 'center';
                  fallback.style.backgroundColor = 'rgba(255,255,255,0.02)';
                  fallback.style.color = '#43e6b5';
                  fallback.style.fontSize = '14px';
                  fallback.style.textAlign = 'center';
                  fallback.style.padding = '20px';
                  fallback.style.fontStyle = 'italic';
                  fallback.innerHTML = `<div>[ Illustration: ${alt} ]<br/><span style="opacity: 0.5; font-size: 11px; margin-top: 8px; display: block;">The image could not be loaded from the AI provider.</span></div>`;
                  parent.replaceChild(fallback, target);
                }
              }}
            />
          </div>
        );
        lastIdx = imgRegex.lastIndex;
      }
      
      const textAfter = line.substring(lastIdx).trim();
      if (textAfter) parts.push(<p key={`p-${lastIdx}`} className={s.p} dangerouslySetInnerHTML={{__html: formatInline(textAfter)}}/>);
      
      elements.push(...parts);
    } else if (line.includes("VISUAL LEARNING") && !line.includes("![")) {
      // Safety Net: If AI forgot the image link in the Visual Learning section, inject one
      const topicPrompt = encodeURIComponent(topic);
      const finalUrl = `https://pollinations.ai/p/Highly%20detailed%20educational%20diagram%20of%20${topicPrompt}?width=800&height=400&nologo=true`;
      elements.push(
        <div key={`safety-${i}`} className={s.imgContainer} onClick={() => onImageClick(finalUrl)}>
          <div className={s.imgHeader}>
             <span className={s.imgTitle}>Generated Topic Illustration</span>
             <button className={s.fullScreenBtn}>🔍 Full Screen</button>
          </div>
          <img 
            src={finalUrl} 
            alt={topic} 
            className={s.genImg} 
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              const parent = target.parentElement;
              if (parent) {
                const fallback = document.createElement('div');
                fallback.style.width = '100%';
                fallback.style.height = '300px';
                fallback.style.display = 'flex';
                fallback.style.alignItems = 'center';
                fallback.style.justifyContent = 'center';
                fallback.style.backgroundColor = 'rgba(255,255,255,0.02)';
                fallback.style.color = '#43e6b5';
                fallback.style.fontSize = '14px';
                fallback.style.textAlign = 'center';
                fallback.style.padding = '20px';
                fallback.style.fontStyle = 'italic';
                fallback.innerHTML = `<div>[ Diagram: ${topic} ]<br/><span style="opacity: 0.5; font-size: 11px; margin-top: 8px; display: block;">The diagram could not be loaded from the AI provider.</span></div>`;
                parent.replaceChild(fallback, target);
              }
            }}
          />
        </div>
      );
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

  const sanitizeMermaid = (code: string) => {
    let clean = code.trim();
    // 1. Remove triple backticks and language identifier
    clean = clean.replace(/^```mermaid\s*/i, "").replace(/```$/m, "").trim();
    
    // 2. Fix truncated keywords (e.g. "graph T" -> "graph TD")
    if (clean.toLowerCase().startsWith("graph t") && !clean.toLowerCase().startsWith("graph td")) {
      clean = clean.replace(/^graph t/i, "graph TD");
    }

    // 3. Identify type
    const lines = clean.split("\n");
    const isMindmap = clean.toLowerCase().includes("mindmap") || lines.some(l => l.startsWith("  ") || l.startsWith("\t"));
    
    // 4. Ensure it starts with a valid keyword
    const validKeywords = ["graph", "mindmap", "flowchart", "sequenceDiagram", "gantt", "classDiagram", "stateDiagram", "erDiagram", "pie"];
    if (!validKeywords.some(k => clean.toLowerCase().startsWith(k.toLowerCase()))) {
      clean = (isMindmap ? "mindmap\n" : "graph TD\n") + clean;
    }

    // 5. Syntax Fixing
    const fixedLines = clean.split("\n").map((line, idx, arr) => {
      let l = line.trimEnd(); 
      if (!l.trim()) return l;
      
      // If it's a keyword line, return as is
      if (validKeywords.some(k => l.trim().toLowerCase().startsWith(k.toLowerCase()))) return l;

      // Fix truncated connections at end of line (e.g. "A -->")
      l = l.replace(/(-{2,}>|==>|-{1,3}|-\.->)$/, "");

      // Fix unclosed quotes/brackets
      if (l.includes("[\"") && !l.includes("\"]")) l += "\"]";
      else if (l.includes("\"") && (l.match(/"/g) || []).length % 2 !== 0) l += "\"";
      
      if (l.includes("[") && !l.includes("]")) l += "]";
      if (l.includes("((") && !l.includes("))")) l += "))";
      if (l.includes("(") && !l.includes(")")) l += ")";
      
      // Remove illegal characters
      l = l.replace(/[#$]/g, "");

      // Special case: if this is the last line and it looks incomplete, just drop it
      if (idx === arr.length - 1 && (l.endsWith("-") || l.endsWith("="))) return "";

      return l;
    });

    return fixedLines.filter(Boolean).join("\n");
  };

  const fallbackSanitize = (code: string) => {
    const lines = code.split("\n")
      .map(l => l.replace(/[^a-zA-Z0-9\s]/g, "").trim())
      .filter(l => l.length > 2);
    if (lines.length === 0) return "graph TD\n  Error[\"Invalid Diagram Data\"]";
    let fallback = "graph TD\n";
    lines.forEach((line, i) => {
      fallback += `  node${i}["${line}"]\n`;
      if (i > 0) fallback += `  node${i-1} --> node${i}\n`;
    });
    return fallback;
  };

  useEffect(() => {
    if (ref.current) {
      const id = `mermaid-${Math.random().toString(36).substring(7)}`;
      const sanitizedChart = sanitizeMermaid(chart);
      
      const render = (code: string, isRetry = false) => {
        mermaid.render(id, code).then(({ svg }) => {
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
          if (!isRetry) {
            console.warn("Mermaid first attempt failed, trying fallback...", e);
            render(fallbackSanitize(chart), true);
          } else {
            console.error("Mermaid fallback also failed:", e);
            if (ref.current) {
              ref.current.innerHTML = `
                <div style="color:#ff6584; padding: 15px; font-size: 12px; text-align: center; border: 1px dashed rgba(255,101,132,0.2); border-radius: 8px; background: rgba(255,101,132,0.02);">
                  <div style="font-weight:bold; margin-bottom: 4px;">Diagram Unavailable</div>
                  <div style="opacity:0.7;">The AI generated a complex diagram that couldn't be rendered.</div>
                </div>
              `;
            }
          }
        });
      };
      render(sanitizedChart);
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
