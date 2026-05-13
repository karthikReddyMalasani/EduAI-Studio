"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import s from "./history.module.css";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";

export default function HistoryPage() {
  const [tests, setTests] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchData() {
      try {
        const [testsRes, notesRes, videosRes] = await Promise.all([
          fetch(`${API_URL}/api/tests/`),
          fetch(`${API_URL}/api/notes/`),
          fetch(`${API_URL}/api/videos/history/`)
        ]);
        
        const [testData, noteData, videoData] = await Promise.all([
          testsRes.ok ? testsRes.json() : [],
          notesRes.ok ? notesRes.json() : [],
          videosRes.ok ? videosRes.json() : []
        ]);

        setTests(Array.isArray(testData) ? testData : []);
        setNotes(Array.isArray(noteData) ? noteData : []);
        setVideos(Array.isArray(videoData) ? videoData : []);
      } catch (err) {
        setError("Failed to fetch history. Ensure the backend is running.");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  return (
    <div className={s.page}>
      <header className={s.header}>
        <Link href="/" className={s.btn} style={{ width:"auto", padding:"8px 16px", position:"absolute", top:"30px", left:"30px" }}>← Back Home</Link>
        <h1 className={s.title}>Learning History</h1>
        <p className={s.sub}>All your AI-generated educational assets in one place</p>
      </header>

      <main className={s.content}>
        {loading ? (
          <div className={s.empty}>Loading your history...</div>
        ) : error ? (
          <div style={{ color: "#ff6584", textAlign: "center" }}>{error}</div>
        ) : (
          <>
            {/* Videos Section */}
            <section className={s.section}>
              <h2 className={s.secTitle}>📹 Animated Videos</h2>
              {videos.length === 0 ? <p className={s.empty}>No videos generated yet.</p> : (
                <div className={s.grid}>
                  {videos.map((v: any) => (
                    <div key={v.id} className={s.card}>
                      <div className={s.cardHeader}>
                        <h3 className={s.cardTitle}>{v.title}</h3>
                        <span className={s.badge}>{v.video_type}</span>
                      </div>
                      <p className={s.cardMeta}>{new Date(v.created_at).toLocaleDateString()}</p>
                      <div className={s.cardActions}>
                        <Link href={`/video-generator?id=${v.id}`} className={s.btn}>Watch Video</Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Notes Section */}
            <section className={s.section}>
              <h2 className={s.secTitle}>📚 Academic Notes</h2>
              {notes.length === 0 ? <p className={s.empty}>No notes generated yet.</p> : (
                <div className={s.grid}>
                  {notes.map((n: any) => (
                    <div key={n.id} className={s.card}>
                      <div className={s.cardHeader}>
                        <h3 className={s.cardTitle}>{n.title}</h3>
                        <span className={s.badge}>{n.style}</span>
                      </div>
                      <p className={s.cardMeta}>{new Date(n.created_at).toLocaleDateString()}</p>
                      <div className={s.cardActions}>
                        <a href={`${API_URL}/api/export-notes/${n.id}/`} className={s.btn}>Download PDF</a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Tests Section */}
            <section className={s.section}>
              <h2 className={s.secTitle}>✍️ Practice Tests</h2>
              {tests.length === 0 ? <p className={s.empty}>No tests generated yet.</p> : (
                <div className={s.grid}>
                  {tests.map((t: any) => (
                    <div key={t.id} className={s.card}>
                      <div className={s.cardHeader}>
                        <h3 className={s.cardTitle}>{t.title}</h3>
                        <span className={s.badge}>{t.difficulty}</span>
                      </div>
                      <p className={s.cardMeta}>{new Date(t.created_at).toLocaleDateString()} · {t.question_count} Qs</p>
                      <div className={s.cardActions}>
                        <a href={`${API_URL}/api/export/${t.id}/`} className={s.btn}>Download Test</a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
