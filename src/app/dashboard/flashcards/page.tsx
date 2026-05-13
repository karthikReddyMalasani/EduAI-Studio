"use client";
import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import s from "../dashboard.module.css";

interface Flashcard {
  front: string;
  back: string;
}

export default function FlashcardsPage() {
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  const generateCards = async () => {
    setLoading(true);
    setCards([]);
    setCurrentIdx(0);
    setIsFlipped(false);
    
    try {
      const res = await fetch("http://localhost:8002/generate/flashcards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: topic, stream: "Academic" }),
      });
      const data = await res.json();
      const parsed = JSON.parse(data.flashcards.replace(/```json/g, "").replace(/```/g, ""));
      setCards(parsed);
    } catch (err) {
      alert("Failed to generate flashcards. Check backend.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={s.page} style={{ padding: "80px 20px", display: "flex", justifyContent: "center" }}>
      <div style={{ maxWidth: "600px", width: "100%" }}>
        <Link href="/dashboard" style={{ color: "var(--primary2)", fontWeight: "bold", display: "block", marginBottom: "40px" }}>← Dashboard</Link>
        
        <h1 className="text-grad" style={{ fontSize: "2.5rem", fontWeight: 900, marginBottom: "10px" }}>Active Recall <span style={{ color: "var(--accent)" }}>Cards</span></h1>
        <p style={{ color: "var(--text2)", marginBottom: "40px" }}>Master complex terms with 3D interactive flashcards.</p>

        {!cards.length && !loading && (
          <div className="glass" style={{ padding: "40px" }}>
            <input 
              type="text" 
              className={s.searchBar} 
              placeholder="Enter subject or chapter topic..."
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              style={{ marginBottom: "20px" }}
            />
            <button className={s.chipActive} style={{ width: "100%", padding: "16px", borderRadius: "12px", border: "none", color: "#fff", fontWeight: "bold" }} onClick={generateCards}>
              Generate Flashcards
            </button>
          </div>
        )}

        {loading && <div style={{ textAlign: "center", color: "var(--accent)", padding: "40px" }}>⏳ Crafting your study deck...</div>}

        {cards.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "30px" }}>
            <div style={{ fontSize: "0.8rem", color: "var(--text2)" }}>Card {currentIdx + 1} of {cards.length}</div>
            
            <div 
              style={{ width: "100%", height: "350px", perspective: "1000px", cursor: "pointer" }}
              onClick={() => setIsFlipped(!isFlipped)}
            >
              <motion.div
                initial={false}
                animate={{ rotateY: isFlipped ? 180 : 0 }}
                transition={{ duration: 0.6, type: "spring", stiffness: 260, damping: 20 }}
                style={{ width: "100%", height: "100%", position: "relative", transformStyle: "preserve-3d" }}
              >
                {/* Front */}
                <div style={{ 
                  position: "absolute", width: "100%", height: "100%", backfaceVisibility: "hidden",
                  background: "var(--surface)", border: "2px solid var(--border)", borderRadius: "24px",
                  display: "flex", alignItems: "center", justifyContent: "center", padding: "40px", textAlign: "center",
                  fontSize: "1.5rem", fontWeight: 700, color: "#fff", boxShadow: "0 20px 50px rgba(0,0,0,0.3)"
                }}>
                  {cards[currentIdx].front}
                </div>
                
                {/* Back */}
                <div style={{ 
                  position: "absolute", width: "100%", height: "100%", backfaceVisibility: "hidden",
                  background: "rgba(108,99,255,0.1)", border: "2px solid var(--primary)", borderRadius: "24px",
                  display: "flex", alignItems: "center", justifyContent: "center", padding: "40px", textAlign: "center",
                  fontSize: "1.1rem", color: "var(--text)", transform: "rotateY(180deg)", lineHeight: 1.6,
                  boxShadow: "0 20px 50px rgba(108,99,255,0.2)"
                }}>
                  {cards[currentIdx].back}
                </div>
              </motion.div>
            </div>

            <div style={{ display: "flex", gap: "20px", width: "100%" }}>
              <button 
                className={s.btn} 
                style={{ flex: 1 }}
                onClick={() => { setCurrentIdx(Math.max(0, currentIdx - 1)); setIsFlipped(false); }}
                disabled={currentIdx === 0}
              >
                Previous
              </button>
              <button 
                className={s.btn} 
                style={{ flex: 1, background: "var(--primary)" }}
                onClick={() => { 
                  if (currentIdx < cards.length - 1) {
                    setCurrentIdx(currentIdx + 1);
                    setIsFlipped(false);
                  } else {
                    setCards([]);
                  }
                }}
              >
                {currentIdx === cards.length - 1 ? "Finish Deck" : "Next Card"}
              </button>
            </div>
            
            <p style={{ color: "var(--text3)", fontSize: "0.85rem" }}>💡 Click the card to flip and see the answer.</p>
          </div>
        )}
      </div>
    </div>
  );
}
