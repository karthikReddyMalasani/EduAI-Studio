"use client";
import { useState } from "react";
import s from "./script-output.module.css";

interface Props { script: string; topic: string; mode: string; onReset: () => void; }

const MODE_LABELS: Record<string,string> = {
  algorithm:"⚡ Algorithm Visualizer", cinematic:"🎬 Cinematic Theory",
  storytelling:"✨ Anime Storytelling", standard:"🎓 Standard Script",
};

export default function ScriptOutput({ script, topic, mode, onReset }: Props) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(script);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([script], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${topic.replace(/\s+/g,"-")}-video-script.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Parse sections by "# " headings
  const sections = script.split(/(?=^# )/m).filter(Boolean);

  return (
    <div className={s.wrap}>
      <div className={s.topBar}>
        <div className={s.topLeft}>
          <div className={s.successDot}/>
          <div>
            <div className={s.topTitle}>Script Generated ✓</div>
            <div className={s.topMeta}>{topic} · {MODE_LABELS[mode] || mode}</div>
          </div>
        </div>
        <div className={s.topActions}>
          <button id="copy-script-btn" className={s.actionBtn} onClick={handleCopy}>{copied ? "✓ Copied!" : "📋 Copy"}</button>
          <button id="download-script-btn" className={s.actionBtn} onClick={handleDownload}>⬇ Download .md</button>
          <button id="reset-btn" className={`${s.actionBtn} ${s.resetBtn}`} onClick={onReset}>✕ New Script</button>
        </div>
      </div>
      <div className={s.content}>
        {sections.length > 1 ? sections.map((sec, i) => {
          const lines = sec.trim().split("\n");
          const title = lines[0].replace(/^#+\s*/, "");
          const body = lines.slice(1).join("\n").trim();
          return (
            <div key={i} className={s.section}>
              <h2 className={s.secTitle}>{title}</h2>
              <ScriptBody text={body}/>
            </div>
          );
        }) : <ScriptBody text={script}/>}
      </div>
    </div>
  );
}

function ScriptBody({ text }: { text: string }) {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }

    if (line.startsWith("## ")) {
      elements.push(<h3 key={i} className={s.h3}>{line.replace(/^##\s*/, "")}</h3>);
    } else if (line.startsWith("### ")) {
      elements.push(<h4 key={i} className={s.h4}>{line.replace(/^###\s*/, "")}</h4>);
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
      elements.push(<div key={i} className={s.codeBlock}><div className={s.codeLang}>{lang||"code"}</div><pre className={s.pre}><code>{codeLines.join("\n")}</code></pre></div>);
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
    .replace(/`(.+?)`/g, "<code>$1</code>");
}
