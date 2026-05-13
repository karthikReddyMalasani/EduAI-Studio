import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, spring, AbsoluteFill, Audio } from "remotion";

export interface AlgorithmStep {
  index: number;
  currentSum: number;
  maxSum: number;
  narration: string;
  activeLines?: number[]; // To highlight code
  code?: string; // To show current logic
}

export interface AlgorithmVideoProps extends Record<string, unknown> {
  title: string;
  array: number[];
  steps: AlgorithmStep[];
  showCaptions?: boolean;
}

export const AlgorithmVideo: React.FC<AlgorithmVideoProps> = ({ title, array, steps, showCaptions = true }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Each step takes 3 seconds for better readability
  const framesPerStep = fps * 3;
  const currentStepIndex = Math.min(Math.floor(frame / framesPerStep), steps.length - 1);
  const currentStep = steps[currentStepIndex] || steps[0];

  if (!currentStep) {
    return <AbsoluteFill style={{ backgroundColor: "#0b0f19", color: "white" }}>Loading...</AbsoluteFill>;
  }

  const frameWithinStep = frame % framesPerStep;
  const progress = spring({
    frame: frameWithinStep,
    fps,
    config: { damping: 15, stiffness: 100 },
  });

  const previousIndex = currentStepIndex > 0 ? steps[currentStepIndex - 1].index : 0;
  // Calculate X based on gap (20px) + box width (80px) = 100px per step
  const startX = previousIndex * 100;
  const targetX = currentStep.index * 100;
  const currentPointerX = interpolate(progress, [0, 1], [startX, targetX]);

  return (
    <AbsoluteFill style={{ backgroundColor: "#0b0f19", color: "white", fontFamily: "'Outfit', sans-serif", overflow: "hidden" }}>
      {/* Background Music */}
      <Audio 
        src="https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3" 
        volume={0.08}
        placeholder={null}
      />
      {/* Background Glow */}
      <div style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        width: "100%",
        height: "100%",
        background: "radial-gradient(circle, rgba(67, 230, 181, 0.05) 0%, transparent 70%)",
        filter: "blur(80px)",
        zIndex: 0
      }} />

      {/* Grid Pattern */}
      <div style={{
        position: "absolute",
        inset: 0,
        backgroundImage: "radial-gradient(rgba(255,255,255,0.03) 1px, transparent 1px)",
        backgroundSize: "30px 30px",
        zIndex: 1
      }} />

      {/* Header */}
      <div style={{ padding: "30px 60px", zIndex: 10, borderBottom: "1px solid rgba(255,255,255,0.1)", display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(11, 15, 25, 0.5)", backdropFilter: "blur(10px)" }}>
        <div style={{ fontSize: "28px", fontWeight: "800" }}>
          ⚡ ALGO<span style={{ color: "#43e6b5" }}>VIZ</span> | <span style={{ color: "#aaa" }}>{title}</span>
        </div>
        <div style={{ fontSize: "20px", color: "#43e6b5", fontWeight: "bold" }}>Step {currentStepIndex + 1} of {steps.length}</div>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: 10, padding: "0 60px" }}>
        
        {/* Array Container */}
        <div style={{ position: "relative", marginBottom: "120px" }}>
          <div style={{ display: "flex", gap: "20px" }}>
            {array.map((num, i) => {
              const isActive = i === currentStep.index;
              const isPast = i < currentStep.index;
              return (
                <div key={i} style={{
                  width: "80px",
                  height: "80px",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  fontSize: "32px",
                  fontWeight: "bold",
                  backgroundColor: isActive ? "#43e6b5" : (isPast ? "rgba(67, 230, 181, 0.1)" : "rgba(255, 255, 255, 0.05)"),
                  border: `2px solid ${isActive ? "#43e6b5" : "rgba(255, 255, 255, 0.1)"}`,
                  borderRadius: "16px",
                  color: isActive ? "#0b0f19" : "white",
                  transform: `scale(${isActive ? 1.15 : 1})`,
                  boxShadow: isActive ? "0 0 30px rgba(67, 230, 181, 0.4)" : "none",
                  transition: "all 0.3s ease"
                }}>
                  {num}
                </div>
              );
            })}
          </div>

          {/* Animated Pointer */}
          <div style={{
            position: "absolute",
            top: "100px",
            left: `${currentPointerX + 20}px`,
            fontSize: "40px",
            filter: "drop-shadow(0 0 10px #43e6b5)"
          }}>
            🔼
          </div>
        </div>

        {/* Status Dashboard & Code */}
        <div style={{ display: "flex", gap: "40px", width: "100%", justifyContent: "center", alignItems: "flex-start" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <div style={{ 
              background: "rgba(255, 255, 255, 0.03)", 
              padding: "20px 40px", 
              borderRadius: "24px", 
              border: "1px solid rgba(255,255,255,0.05)",
              textAlign: "center",
              minWidth: "220px"
            }}>
              <div style={{ color: "#aaa", fontSize: "16px", marginBottom: "5px", fontWeight: "600" }}>CURRENT SUM</div>
              <div style={{ fontSize: "56px", color: "#ffd700", fontWeight: "900" }}>{currentStep.currentSum}</div>
            </div>
            <div style={{ 
              background: "rgba(255, 255, 255, 0.03)", 
              padding: "20px 40px", 
              borderRadius: "24px", 
              border: "1px solid rgba(255,255,255,0.05)",
              textAlign: "center",
              minWidth: "220px"
            }}>
              <div style={{ color: "#aaa", fontSize: "16px", marginBottom: "5px", fontWeight: "600" }}>GLOBAL MAX</div>
              <div style={{ fontSize: "56px", color: "#43e6b5", fontWeight: "900" }}>{currentStep.maxSum}</div>
            </div>
          </div>

          {currentStep.code && (
            <div style={{
              background: "rgba(0, 0, 0, 0.3)",
              padding: "25px",
              borderRadius: "20px",
              border: "1px solid rgba(108, 99, 255, 0.2)",
              minWidth: "450px",
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: "20px",
              color: "#d1d5db",
              boxShadow: "0 10px 40px rgba(0,0,0,0.3)"
            }}>
              <div style={{ color: "#6c63ff", fontSize: "14px", marginBottom: "15px", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "1px" }}>Logic Execution</div>
              {currentStep.code.split('\n').map((line, i) => {
                const isActive = currentStep.activeLines?.includes(i + 1);
                return (
                  <div key={i} style={{ 
                    padding: "4px 10px",
                    background: isActive ? "rgba(108, 99, 255, 0.15)" : "transparent",
                    borderLeft: `3px solid ${isActive ? "#6c63ff" : "transparent"}`,
                    color: isActive ? "#fff" : "#94a3b8",
                    transition: "all 0.2s"
                  }}>
                    <span style={{ opacity: 0.3, marginRight: "15px", fontSize: "14px" }}>{i + 1}</span>
                    {line}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div style={{ position: "absolute", bottom: 0, left: 0, width: "100%", height: "8px", background: "rgba(255,255,255,0.1)", zIndex: 30 }}>
        <div style={{ 
          width: `${(frame / durationInFrames) * 100}%`, 
          height: "100%", 
          background: "linear-gradient(90deg, #43e6b5, #6c63ff)",
          boxShadow: "0 0 10px rgba(67, 230, 181, 0.8)"
        }} />
      </div>

      {/* Captions */}
      {showCaptions && (
        <div style={{
          position: "absolute",
          bottom: "60px",
          width: "100%",
          display: "flex",
          justifyContent: "center",
          zIndex: 40
        }}>
          <div style={{
            maxWidth: "70%",
            fontSize: "32px",
            textAlign: "center",
            padding: "20px 40px",
            background: "rgba(0,0,0,0.8)",
            backdropFilter: "blur(12px)",
            borderRadius: "30px",
            border: "1px solid rgba(255,255,255,0.15)",
            color: "#fff",
            lineHeight: "1.4",
            fontWeight: "500",
            boxShadow: "0 10px 30px rgba(0,0,0,0.5)"
          }}>
            {currentStep.narration}
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
};
