import React from "react";
import { useCurrentFrame, useVideoConfig, spring, interpolate, AbsoluteFill, Audio } from "remotion";

export interface GenericScene {
  keyword: string;
  emoji: string;
  bulletPoints: string[];
  narration: string;
  durationInFrames?: number; // Optional dynamic duration
}

export interface GenericVideoProps extends Record<string, unknown> {
  title: string;
  scenes: GenericScene[];
  showCaptions?: boolean;
}

export const GenericVideo: React.FC<GenericVideoProps> = ({ title, scenes, showCaptions = true }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames, width, height } = useVideoConfig();

  // If scenes have dynamic durations, calculate cumulative frames
  let cumulativeFrames = 0;
  const sceneRanges = scenes.map(s => {
    const start = cumulativeFrames;
    const duration = s.durationInFrames || (fps * 5); // Default 5s if not specified
    cumulativeFrames += duration;
    return { start, end: cumulativeFrames };
  });

  const currentSceneIndex = sceneRanges.findIndex(r => frame >= r.start && frame < r.end);
  const currentSceneIdx = currentSceneIndex === -1 ? scenes.length - 1 : currentSceneIndex;
  const currentScene = scenes[currentSceneIdx];
  const currentRange = sceneRanges[currentSceneIdx];

  if (!currentScene) {
    return <AbsoluteFill style={{ backgroundColor: "#0b0f19", color: "white" }}>Loading...</AbsoluteFill>;
  }

  const frameWithinScene = frame - currentRange.start;
  const sceneDuration = currentRange.end - currentRange.start;
  
  // Transitions
  const opacity = interpolate(frameWithinScene, [0, 15, sceneDuration - 15, sceneDuration], [0, 1, 1, 0]);
  const scale = interpolate(frameWithinScene, [0, sceneDuration], [1, 1.05]);

  // Emoji animation
  const emojiSpring = spring({
    frame: frameWithinScene,
    fps,
    config: { damping: 10, stiffness: 100 },
  });

  // Background Particles (Simple simulated glow)
  const glowOpacity = interpolate(Math.sin(frame / 30), [-1, 1], [0.3, 0.6]);

  return (
    <AbsoluteFill style={{ backgroundColor: "#0b0f19", color: "white", fontFamily: "'Outfit', sans-serif", overflow: "hidden" }}>
      {/* Dynamic Background */}
      <div style={{
        position: "absolute",
        top: "-20%",
        left: "-20%",
        width: "140%",
        height: "140%",
        background: `radial-gradient(circle at 50% 50%, rgba(108, 99, 255, ${glowOpacity * 0.2}) 0%, transparent 70%)`,
        filter: "blur(100px)",
        zIndex: 0
      }} />

      {/* Grid Pattern Overlay */}
      <div style={{
        position: "absolute",
        inset: 0,
        backgroundImage: "radial-gradient(rgba(255,255,255,0.05) 1px, transparent 1px)",
        backgroundSize: "40px 40px",
        zIndex: 1
      }} />

      {/* Header */}
      <div style={{ 
        padding: "40px 80px", 
        zIndex: 10, 
        background: "rgba(11, 15, 25, 0.7)",
        backdropFilter: "blur(10px)",
        borderBottom: "1px solid rgba(255,255,255,0.1)", 
        display: "flex", 
        justifyContent: "space-between",
        alignItems: "center" 
      }}>
        <div style={{ fontSize: "32px", fontWeight: "800", letterSpacing: "-1px" }}>
          ⚡ EDU<span style={{ color: "#6c63ff" }}>AI</span> STUDIO
        </div>
        <div style={{ fontSize: "24px", opacity: 0.8, fontWeight: "500" }}>{title}</div>
      </div>
      
      {/* Main Content Area */}
      <div style={{ display: "flex", flex: 1, padding: "80px", zIndex: 10, opacity, transform: `scale(${scale})` }}>
        
        {/* Left: Visual representation */}
        <div style={{ flex: 1.2, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", position: "relative" }}>
          <div style={{ 
            position: "absolute",
            width: "400px",
            height: "400px",
            background: "rgba(108, 99, 255, 0.2)",
            borderRadius: "50%",
            filter: "blur(60px)",
            zIndex: -1
          }} />
          <div style={{ fontSize: "320px", transform: `scale(${emojiSpring})`, filter: "drop-shadow(0 20px 40px rgba(0,0,0,0.5))" }}>
            {currentScene.emoji}
          </div>
          <div style={{ 
            marginTop: "60px",
            fontSize: "72px",
            fontWeight: "900",
            background: "linear-gradient(to bottom, #fff, #a29bfe)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            textAlign: "center"
          }}>
            {currentScene.keyword}
          </div>
        </div>

        {/* Right: Key Takeaways */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: "30px", paddingLeft: "60px", borderLeft: "2px solid rgba(108, 99, 255, 0.2)" }}>
          {currentScene.bulletPoints.map((bullet, idx) => {
            const delay = 10 + (idx * 15);
            const bOpacity = interpolate(frameWithinScene - delay, [0, 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            const bX = interpolate(frameWithinScene - delay, [0, 10], [30, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

            return (
              <div key={idx} style={{ 
                fontSize: "32px", 
                opacity: bOpacity, 
                transform: `translateX(${bX}px)`,
                display: "flex",
                gap: "20px",
                lineHeight: "1.3",
                background: "rgba(255,255,255,0.03)",
                padding: "20px",
                borderRadius: "16px",
                border: "1px solid rgba(255,255,255,0.05)"
              }}>
                <span style={{ color: "#6c63ff" }}>✦</span>
                {bullet}
              </div>
            );
          })}
        </div>
      </div>

      {/* Progress Bar */}
      <div style={{ position: "absolute", bottom: 0, left: 0, width: "100%", height: "8px", background: "rgba(255,255,255,0.1)", zIndex: 30 }}>
        <div style={{ 
          width: `${(frame / durationInFrames) * 100}%`, 
          height: "100%", 
          background: "linear-gradient(90deg, #6c63ff, #43e6b5)",
          boxShadow: "0 0 10px rgba(108, 99, 255, 0.8)"
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
            background: "rgba(0,0,0,0.7)",
            backdropFilter: "blur(12px)",
            borderRadius: "30px",
            border: "1px solid rgba(255,255,255,0.15)",
            color: "#fff",
            lineHeight: "1.4",
            fontWeight: "500",
            boxShadow: "0 10px 30px rgba(0,0,0,0.5)"
          }}>
            {currentScene.narration}
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
};
