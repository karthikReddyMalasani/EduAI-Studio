"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import s from "../home.module.css"; // Reuse some home styles for consistency

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";

export default function HistoryPage() {
  const [tests, setTests] = useState([]);
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchData() {
      try {
        const [testsRes, notesRes] = await Promise.all([
          fetch(`${API_URL}/api/tests/`),
          fetch(`${API_URL}/api/notes/`)
        ]);

        if (testsRes.ok) setTests(await testsRes.json());
        if (notesRes.ok) setNotes(await notesRes.json());
      } catch (err) {
        setError("Failed to fetch history. Ensure the backend is running.");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  return (
    <div className={s.page} style={{ padding: "40px 80px" }}>
      <nav style={{ marginBottom: "40px" }}>
        <Link href="/" style={{ color: "#6c63ff", fontWeight: "bold" }}>← Back Home</Link>
      </nav>

      <h1 className={s.heroTitle} style={{ fontSize: "48px", textAlign: "left", marginBottom: "40px" }}>
        Your <span className={s.grad1}>Learning</span> History
      </h1>

      {loading ? (
        <div style={{ color: "white" }}>Loading history...</div>
      ) : error ? (
        <div style={{ color: "#ff6584", background: "rgba(255,101,132,0.1)", padding: "20px", borderRadius: "12px" }}>{error}</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "40px" }}>
          
          {/* Tests Section */}
          <section>
            <h2 style={{ color: "#43e6b5", marginBottom: "20px", fontSize: "24px" }}>Generated Tests</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
              {tests.length === 0 ? (
                <p style={{ color: "#aaa" }}>No tests found.</p>
              ) : tests.map((t: any) => (
                <div key={t.id} style={{ background: "rgba(255,255,255,0.03)", padding: "20px", borderRadius: "16px", border: "1px solid rgba(255,255,255,0.05)" }}>
                  <h3 style={{ color: "white", margin: 0 }}>{t.title}</h3>
                  <div style={{ color: "#888", fontSize: "14px", marginTop: "5px" }}>{t.subject} · {t.difficulty}</div>
                  <div style={{ marginTop: "15px", display: "flex", gap: "10px" }}>
                    <a href={`${API_URL}/api/export/${t.id}/`} className={s.modeTag} style={{ borderColor: "#6c63ff", color: "#6c63ff", cursor: "pointer" }}>Download PDF</a>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Notes Section */}
          <section>
            <h2 style={{ color: "#a29bfe", marginBottom: "20px", fontSize: "24px" }}>Generated Notes</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
              {notes.length === 0 ? (
                <p style={{ color: "#aaa" }}>No notes found.</p>
              ) : notes.map((n: any) => (
                <div key={n.id} style={{ background: "rgba(255,255,255,0.03)", padding: "20px", borderRadius: "16px", border: "1px solid rgba(255,255,255,0.05)" }}>
                  <h3 style={{ color: "white", margin: 0 }}>{n.title}</h3>
                  <div style={{ color: "#888", fontSize: "14px", marginTop: "5px" }}>{n.subject} · {n.style}</div>
                  <div style={{ marginTop: "15px", display: "flex", gap: "10px" }}>
                    <a href={`${API_URL}/api/export-notes/${n.id}/`} className={s.modeTag} style={{ borderColor: "#a29bfe", color: "#a29bfe", cursor: "pointer" }}>Download PDF</a>
                  </div>
                </div>
              ))}
            </div>
          </section>

        </div>
      )}
    </div>
  );
}
