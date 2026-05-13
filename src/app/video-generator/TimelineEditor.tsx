"use client";
import { useState } from "react";
import { motion, Reorder } from "framer-motion";
import s from "./video-generator.module.css";

interface Scene {
  id: string;
  keyword: string;
  emoji: string;
  narration: string;
  durationInFrames: number;
}

export default function TimelineEditor({ scenes, onUpdate }: { scenes: Scene[], onUpdate: (scenes: Scene[]) => void }) {
  const [items, setItems] = useState(scenes);

  const handleReorder = (newOrder: Scene[]) => {
    setItems(newOrder);
    onUpdate(newOrder);
  };

  return (
    <div className="glass" style={{ padding: "32px", marginTop: "40px" }}>
      <h2 style={{ marginBottom: "24px", display: "flex", alignItems: "center", gap: "10px" }}>
        🎬 Video Timeline <span style={{ fontSize: "0.8rem", color: "var(--text2)", fontWeight: "normal" }}>Drag to reorder scenes</span>
      </h2>
      
      <Reorder.Group axis="y" values={items} onReorder={handleReorder} className={s.timelineList}>
        {items.map((item) => (
          <Reorder.Item key={item.id} value={item} className={s.timelineItem}>
            <div style={{ display: "flex", gap: "20px", alignItems: "center" }}>
              <div className={s.sceneThumb}>
                <span>{item.emoji}</span>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, color: "#fff" }}>{item.keyword}</div>
                <div style={{ fontSize: "0.85rem", color: "var(--text2)", marginTop: "4px" }}>
                  {item.narration.slice(0, 80)}...
                </div>
              </div>
              <div style={{ fontSize: "0.8rem", color: "var(--primary2)", fontWeight: "bold" }}>
                {Math.round(item.durationInFrames / 30)}s
              </div>
            </div>
          </Reorder.Item>
        ))}
      </Reorder.Group>
    </div>
  );
}
