"use client";
import { useState } from "react";
import Link from "next/link";
import s from "./dashboard.module.css";

const STREAMS = [
  "Engineering", "Medicine", "UPSC", "Commerce", "Law", "Programming", "School"
];

const TOOLS = [
  { id: "notes", name: "Expert Notes", desc: "Detailed academic notes with mindmaps", icon: "📚", href: "/notes-generator" },
  { id: "videos", name: "Visualizer Engine", desc: "Interactive DSA & Science visualizations", icon: "🎬", href: "/visualizers/dsa" },
  { id: "quizzes", name: "Adaptive Tests", desc: "Interactive MCQs with RAG context", icon: "✍️", href: "/dashboard/quiz" },
  { id: "flashcards", name: "Memory Cards", desc: "Flashcards for quick revision", icon: "🃏", href: "/dashboard/flashcards" },
];

export default function Dashboard() {
  const [stream, setStream] = useState("Engineering");
  const [isUploading, setIsUploading] = useState(false);
  const [search, setSearch] = useState("");
  const [uploadStatus, setUploadStatus] = useState("");

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadStatus("Ingesting document...");
    
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("http://localhost:8002/ingest", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setUploadStatus("Ready: " + data.message);
      } else {
        setUploadStatus("Upload failed.");
      }
    } catch (err) {
      setUploadStatus("Backend unreachable.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className={s.page}>
      <div className={s.orb1}/><div className={s.orb2}/>
      
      <div className={s.container}>
        <aside className={s.sidebar}>
          <div className={s.logo}>⚡ EduAI <span className="text-grad">Studio</span></div>
          <ul className={s.menu}>
            <li className={`${s.menuItem} ${s.menuActive}`}>🏠 Dashboard</li>
            <li className={s.menuItem}>📜 History</li>
            <li className={s.menuItem}>⚙️ Settings</li>
            <li className={s.menuItem}>💎 Upgrade</li>
          </ul>
        </aside>

        <main className={s.main}>
          <header className={s.header}>
            <h1 className={s.title}>Welcome back, <span className="text-grad">Scholar</span></h1>
            <div className={s.selector}>
              {STREAMS.map(str => (
                <button 
                  key={str} 
                  className={`${s.chip} ${stream === str ? s.chipActive : ""}`}
                  onClick={() => setStream(str)}
                >
                  {str}
                </button>
              ))}
            </div>
          </header>

          <label className={s.uploadZone}>
            <input 
              type="file" 
              hidden 
              onChange={handleUpload} 
              accept=".pdf,.txt"
            />
            <div className={s.uploadIcon}>{isUploading ? "⏳" : "📂"}</div>
            <h3>{isUploading ? "Indexing Documents..." : (uploadStatus || "Upload Syllabus / PDFs")}</h3>
            <p className={s.cardDesc}>Feed the RAG engine with your specific course material</p>
          </label>

          <section>
            <input 
              type="text" 
              className={s.searchBar} 
              placeholder={`Ask anything about ${stream}... (e.g. explain Kadane's Algorithm)`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </section>

          <div className={s.grid}>
            {TOOLS.map(tool => (
              <Link href={tool.href} key={tool.id} className={s.card}>
                <div className={s.uploadIcon}>{tool.icon}</div>
                <h3 className={s.cardTitle}>{tool.name}</h3>
                <p className={s.cardDesc}>{tool.desc}</p>
                <div style={{ marginTop: "20px", color: "var(--primary2)", fontWeight: "bold" }}>Open Module →</div>
              </Link>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
