import Link from "next/link";
import styles from "./home.module.css";

export default function HomePage() {
  return (
    <div className={styles.page}>
      <div className={styles.orb1} /><div className={styles.orb2} /><div className={styles.orb3} />
      <header className={styles.header}>
        <div className={styles.logo}>⚡ EduAI Studio</div>
        <p className={styles.tagline}>AI-Powered Educational Content — <span>Videos · Notes · Quizzes</span></p>
        <Link href="/history" className={styles.modeTag} style={{ marginTop: "15px", display: "inline-block", borderColor: "#6c63ff", color: "#6c63ff" }}>📜 View History</Link>
      </header>
      <main className={styles.main}>
        <h1 className={styles.heroTitle}>
          Create <span className={styles.grad1}>Animated</span> Videos<br />
          &amp; <span className={styles.grad2}>Expert Notes</span> with AI
        </h1>
        <p className={styles.heroSub}>
          Transform any topic into production-ready animated video scripts or comprehensive academic notes in seconds.
        </p>
        <div className={styles.tools}>
          <Link href="/video-generator" id="tool-video" className={styles.toolCard}>
            <div className={styles.toolIcon}>🎬</div>
            <div className={styles.toolBadge} style={{background:"rgba(108,99,255,0.18)",color:"#9d97ff"}}>NEW</div>
            <h2 className={styles.toolTitle}>Animated Video Generator</h2>
            <p className={styles.toolDesc}>Generate full scene-by-scene animated video scripts with narration, effects, and export instructions.</p>
            <div className={styles.toolModes}>
              <span className={styles.modeTag} style={{borderColor:"#ff6584",color:"#ff6584"}}>⚡ Algorithm Viz</span>
              <span className={styles.modeTag} style={{borderColor:"#a29bfe",color:"#a29bfe"}}>🎬 Cinematic</span>
              <span className={styles.modeTag} style={{borderColor:"#43e6b5",color:"#43e6b5"}}>✨ Storytelling</span>
            </div>
            <div className={styles.toolAction}>Generate Script →</div>
          </Link>
          <Link href="/notes-generator" id="tool-notes" className={styles.toolCard}>
            <div className={styles.toolIcon}>📚</div>
            <div className={styles.toolBadge} style={{background:"rgba(67,230,181,0.15)",color:"#43e6b5"}}>16 SECTIONS</div>
            <h2 className={styles.toolTitle}>Academic Notes Generator</h2>
            <p className={styles.toolDesc}>Get exam-ready, interview-oriented comprehensive notes with code, MCQs, roadmaps, and cheat sheets.</p>
            <div className={styles.toolModes}>
              <span className={styles.modeTag} style={{borderColor:"#ffd700",color:"#ffd700"}}>📝 Exam Prep</span>
              <span className={styles.modeTag} style={{borderColor:"#43e6b5",color:"#43e6b5"}}>💻 Coding</span>
              <span className={styles.modeTag} style={{borderColor:"#ff6584",color:"#ff6584"}}>🎯 Interviews</span>
            </div>
            <div className={styles.toolAction}>Generate Notes →</div>
          </Link>
        </div>
        <div className={styles.stats}>
          <div className={styles.stat}><span className={styles.statNum}>10+</span><span className={styles.statLabel}>Sections per Output</span></div>
          <div className={styles.statDiv}/>
          <div className={styles.stat}><span className={styles.statNum}>3</span><span className={styles.statLabel}>Video Modes</span></div>
          <div className={styles.statDiv}/>
          <div className={styles.stat}><span className={styles.statNum}>16</span><span className={styles.statLabel}>Notes Sections</span></div>
          <div className={styles.statDiv}/>
          <div className={styles.stat}><span className={styles.statNum}>∞</span><span className={styles.statLabel}>Topics</span></div>
        </div>
      </main>
      <footer className={styles.footer}>Powered by <strong>Top-Tier AI Models</strong> · Built for Educators & Students</footer>
    </div>
  );
}
