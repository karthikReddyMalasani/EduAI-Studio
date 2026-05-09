import React from "react";
import { useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";

export interface GenericScene {
  keyword: string;
  emoji: string;
  bulletPoints: string[];
  narration: string;
}

export interface GenericVideoProps {
  title: string;
  scenes: GenericScene[];
  showCaptions?: boolean;
}

export const GenericVideo: React.FC<GenericVideoProps> = ({ title, scenes, showCaptions = true }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Each scene takes 4 seconds
  const framesPerScene = fps * 4;
  const currentSceneIndex = Math.min(Math.floor(frame / framesPerScene), scenes.length - 1);
  const currentScene = scenes[currentSceneIndex];

  if (!currentScene) {
    return <div style={{ backgroundColor: "#0b0f19", flex: 1, color: "white" }}>Loading...</div>;
  }

  // Animation within the current scene
  const frameWithinScene = frame % framesPerScene;
  
  // Emoji scale animation (pop in)
  const emojiScale = spring({
    frame: frameWithinScene,
    fps,
    config: { damping: 12 },
  });

  // Keyword slide up animation
  const keywordY = interpolate(frameWithinScene, [0, 15], [50, 0], {
    extrapolateRight: "clamp",
  });
  const keywordOpacity = interpolate(frameWithinScene, [0, 15], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        flex: 1,
        backgroundColor: "#0b0f19",
        display: "flex",
        flexDirection: "column",
        color: "white",
        fontFamily: "sans-serif",
        position: "relative",
        overflow: "hidden"
      }}
    >
      {/* Background Aura */}
      <div style={{
        position: "absolute",
        top: "50%",
        left: "30%",
        transform: "translate(-50%, -50%)",
        width: "1200px",
        height: "1200px",
        background: "radial-gradient(circle, rgba(108, 99, 255, 0.15) 0%, transparent 70%)",
        filter: "blur(80px)",
        zIndex: 0
      }} />

      {/* Header */}
      <div style={{ padding: "40px 60px", zIndex: 10, borderBottom: "1px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center" }}>
        <h1 style={{ fontSize: "40px", fontWeight: "bold", margin: 0, color: "#fff" }}>
          EduAI <span style={{ color: "#6c63ff" }}>Studio</span> | {title}
        </h1>
      </div>
      
      {/* Main Content Area */}
      <div style={{ display: "flex", flex: 1, padding: "60px", zIndex: 10 }}>
        
        {/* Left: Emoji and Keyword */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", borderRight: "1px solid rgba(255,255,255,0.1)" }}>
          <div style={{ fontSize: "250px", transform: `scale(${emojiScale})`, filter: "drop-shadow(0 0 40px rgba(108, 99, 255, 0.6))" }}>
            {currentScene.emoji}
          </div>
          <h2 style={{ 
            fontSize: "60px", 
            marginTop: "40px", 
            color: "#43e6b5", 
            transform: `translateY(${keywordY}px)`, 
            opacity: keywordOpacity,
            textShadow: "0 0 20px rgba(67, 230, 181, 0.4)"
          }}>
            {currentScene.keyword}
          </h2>
        </div>

        {/* Right: Bullet Points */}
        <div style={{ flex: 1, paddingLeft: "80px", display: "flex", flexDirection: "column", justifyContent: "center", gap: "40px" }}>
          {currentScene.bulletPoints.map((bullet, idx) => {
            // Stagger the fade in of bullet points
            const delay = 15 + (idx * 20); // 15 frames base + 20 frames per bullet
            const bulletOpacity = interpolate(frameWithinScene - delay, [0, 15], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });
            const bulletX = interpolate(frameWithinScene - delay, [0, 15], [50, 0], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });

            return (
              <div 
                key={idx} 
                style={{ 
                  fontSize: "36px", 
                  opacity: bulletOpacity, 
                  transform: `translateX(${bulletX}px)`,
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "20px"
                }}
              >
                <span style={{ color: "#ff6584", fontSize: "40px" }}>•</span>
                <span style={{ lineHeight: "1.4" }}>{bullet}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Narration Subtitle */}
      {showCaptions && (
        <div style={{
          position: "absolute",
          bottom: "50px",
          left: "50%",
          transform: "translateX(-50%)",
          fontSize: "36px",
          backgroundColor: "rgba(0,0,0,0.8)",
          border: "1px solid rgba(255,255,255,0.2)",
          padding: "20px 40px",
          borderRadius: "20px",
          zIndex: 20,
          textAlign: "center",
          width: "80%",
          backdropFilter: "blur(10px)"
        }}>
          {currentScene.narration}
        </div>
      )}

    </div>
  );
};
