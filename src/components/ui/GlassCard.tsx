"use client";
import { ReactNode } from "react";

export default function GlassCard({ children, className = "", style = {} }: { children: ReactNode, className?: string, style?: any }) {
  return (
    <div 
      className={`glass ${className}`} 
      style={{ 
        padding: "32px", 
        background: "rgba(255, 255, 255, 0.03)", 
        backdropFilter: "blur(12px)",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        borderRadius: "24px",
        ...style 
      }}
    >
      {children}
    </div>
  );
}
