"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import s from "../visualizer.module.css";

const INITIAL_ARRAY = [45, 12, 89, 3, 27, 56];

export default function DSAVisualizer() {
  const [array, setArray] = useState([...INITIAL_ARRAY]);
  const [activeIndices, setActiveIndices] = useState<number[]>([]);
  const [isSorting, setIsSorting] = useState(false);
  const [step, setStep] = useState(0);

  const bubbleSort = async () => {
    setIsSorting(true);
    let arr = [...array];
    for (let i = 0; i < arr.length; i++) {
      for (let j = 0; j < arr.length - i - 1; j++) {
        setActiveIndices([j, j + 1]);
        setStep(j);
        await new Promise(r => setTimeout(r, 800));
        
        if (arr[j] > arr[j + 1]) {
          [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
          setArray([...arr]);
        }
      }
    }
    setActiveIndices([]);
    setIsSorting(false);
  };

  return (
    <div style={{ background: "#080b14", minHeight: "100vh", padding: "60px 20px", color: "#fff", fontFamily: "'Outfit', sans-serif" }}>
      <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
        <nav style={{ marginBottom: "40px" }}>
          <Link href="/dashboard" style={{ color: "var(--primary2)", fontWeight: "bold" }}>← Back to Dashboard</Link>
        </nav>

        <header style={{ textAlign: "center", marginBottom: "60px" }}>
          <h1 style={{ fontSize: "2.5rem", fontWeight: 900 }}>DSA <span style={{ color: "var(--accent2)" }}>Visualizer</span></h1>
          <p style={{ color: "var(--text2)", marginTop: "10px" }}>Experience algorithms through interactive motion</p>
        </header>

        <div className={s.stage}>
          <AnimatePresence>
            {array.map((val, idx) => (
              <motion.div 
                key={idx}
                layout
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className={`${s.node} ${activeIndices.includes(idx) ? s.activeNode : ""}`}
              >
                {val}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "40px" }}>
          <div className={s.codeBox}>
            <div className={step === 0 ? s.activeLine : ""}>for (let i = 0; i &lt; n; i++) &#123;</div>
            <div className={step > 0 ? s.activeLine : ""} style={{ paddingLeft: "20px" }}>for (let j = 0; j &lt; n - i - 1; j++) &#123;</div>
            <div className={activeIndices.length > 0 ? s.activeLine : ""} style={{ paddingLeft: "40px" }}>if (arr[j] &gt; arr[j+1]) &#123;</div>
            <div style={{ paddingLeft: "60px" }}>swap(arr[j], arr[j+1]);</div>
            <div style={{ paddingLeft: "40px" }}>&#125;</div>
            <div style={{ paddingLeft: "20px" }}>&#125;</div>
            <div>&#125;</div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <div className={s.btn} onClick={bubbleSort} style={{ textAlign: "center", background: "var(--primary)" }}>
              {isSorting ? "Sorting..." : "Start Bubble Sort"}
            </div>
            <div className={s.btn} onClick={() => setArray([...INITIAL_ARRAY])} style={{ textAlign: "center" }}>
              Reset Array
            </div>
            <div className={s.codeBox} style={{ color: "#fff", background: "rgba(108,99,255,0.05)" }}>
              <strong>Execution Insight:</strong>
              <p style={{ marginTop: "10px", fontSize: "0.85rem", color: "var(--text2)" }}>
                Currently comparing indices {activeIndices.join(" & ")}. 
                Bubble sort has a Time Complexity of O(n²).
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
