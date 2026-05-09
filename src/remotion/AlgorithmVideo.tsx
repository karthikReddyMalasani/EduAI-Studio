import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";

export interface AlgorithmStep {
  index: number;
  currentSum: number;
  maxSum: number;
  narration: string;
  activeLines: number[];
}

export interface AlgorithmVideoProps {
  title: string;
  array: number[];
  steps: AlgorithmStep[];
  showCaptions?: boolean;
}

export const AlgorithmVideo: React.FC<AlgorithmVideoProps> = ({ title, array, steps, showCaptions = true }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Each step takes 2 seconds
  const framesPerStep = fps * 2;
  const currentStepIndex = Math.min(Math.floor(frame / framesPerStep), steps.length - 1);
  const currentStep = steps[currentStepIndex] || steps[0];

  if (!currentStep) {
    return <div style={{ backgroundColor: "#0b0f19", flex: 1, color: "white" }}>Loading...</div>;
  }

  // Calculate smooth pointer position using spring
  const targetX = currentStep.index * 100; // 100px per item
  
  // We use spring to animate to the new targetX whenever stepIndex changes
  // A bit complex in pure Remotion without helpers, so we'll do a simple linear interpolation within the frame window
  const frameWithinStep = frame % framesPerStep;
  const progress = spring({
    frame: frameWithinStep,
    fps,
    config: { damping: 12 },
  });

  const previousIndex = currentStepIndex > 0 ? steps[currentStepIndex - 1].index : 0;
  const startX = previousIndex * 100;
  const currentX = interpolate(progress, [0, 1], [startX, targetX]);

  return (
    <div
      style={{
        flex: 1,
        backgroundColor: "#0b0f19",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        color: "white",
        fontFamily: "sans-serif",
        position: "relative",
        overflow: "hidden"
      }}
    >
      {/* Background Aura */}
      <div style={{
        position: "absolute",
        width: "800px",
        height: "800px",
        background: "radial-gradient(circle, rgba(67, 230, 181, 0.15) 0%, transparent 70%)",
        filter: "blur(60px)",
        zIndex: 0
      }} />

      <h1 style={{ fontSize: "50px", fontWeight: "bold", zIndex: 10, color: "#43e6b5" }}>{title}</h1>
      
      {/* Narration Subtitle */}
      {showCaptions && (
        <div style={{
          position: "absolute",
          bottom: "50px",
          left: "50%",
          transform: "translateX(-50%)",
          fontSize: "32px",
          backgroundColor: "rgba(0,0,0,0.7)",
          padding: "10px 30px",
          borderRadius: "20px",
          zIndex: 20,
          textAlign: "center",
          width: "80%"
        }}>
          {currentStep.narration}
        </div>
      )}

      <div style={{ display: "flex", gap: "20px", marginTop: "50px", position: "relative", zIndex: 10 }}>
        {array.map((num, i) => {
          const isActive = i === currentStep.index;
          return (
            <div
              key={i}
              style={{
                width: "80px",
                height: "80px",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                fontSize: "30px",
                fontWeight: "bold",
                backgroundColor: isActive ? "#6c63ff" : "rgba(255, 255, 255, 0.05)",
                border: `2px solid ${isActive ? "#6c63ff" : "rgba(255, 255, 255, 0.2)"}`,
                borderRadius: "15px",
                color: num >= 0 ? (isActive ? "white" : "#43e6b5") : (isActive ? "white" : "#ff6584"),
                transform: `scale(${isActive ? 1.1 : 1})`,
                boxShadow: isActive ? "0 0 20px rgba(108, 99, 255, 0.6)" : "none",
                transition: "all 0.2s"
              }}
            >
              {num}
            </div>
          );
        })}

        {/* Pointer Arrow */}
        <div style={{
          position: "absolute",
          bottom: "-50px",
          left: `${currentX + 18}px`, // Centered on the 80px box (+18px offset from math)
          fontSize: "40px",
          color: "white"
        }}>
          🔼
        </div>
      </div>

      <div style={{ display: "flex", gap: "60px", marginTop: "100px", zIndex: 10 }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ color: "#8892a4", fontSize: "20px" }}>CURRENT SUM</div>
          <div style={{ fontSize: "60px", color: "#ffd700", fontWeight: "bold" }}>{currentStep.currentSum}</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ color: "#8892a4", fontSize: "20px" }}>MAX SUM</div>
          <div style={{ fontSize: "60px", color: "#43e6b5", fontWeight: "bold" }}>{currentStep.maxSum}</div>
        </div>
      </div>
    </div>
  );
};
