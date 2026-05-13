# EduAI-Studio: Project Documentation

## 1. Product Overview
**EduAI-Studio** is a next-generation AI-powered educational content engine designed for students, educators, and content creators. It transforms abstract academic topics into high-fidelity learning assets, specifically **Animated Videos** and **Expert-Level Study Notes**.

The platform leverages state-of-the-art Large Language Models (LLMs) like LLaMA 3.3 and programmatic video technologies like Remotion to automate the creation of pedagogical resources that previously required hours of manual labor.

---

## 2. Software Requirements Specification (SRS)

### 2.1 Introduction
The goal of this project is to provide a unified workspace for automated educational asset generation with a focus on speed, visual quality, and academic accuracy.

### 2.2 Tech Stack
- **Frontend**: Next.js 15 (App Router), TypeScript, CSS Modules.
- **Backend**: Django (Python), Django REST Framework (DRF).
- **AI Engine**: 
  - **OpenRouter/Groq**: Powering LLaMA 3.3 for script and note generation.
  - **Pollinations AI**: Dynamic image and diagram generation.
- **Video Rendering**: Remotion (Programmatic React-based video).
- **Database**: SQLite (Development) / PostgreSQL (Production).
- **Deployment**: Netlify (Frontend) / Railway/Render (Backend).

### 2.3 User Classes
- **Students**: Users looking for quick, high-quality study materials and visual explanations.
- **Educators**: Content creators needing scripts for educational channels or classroom slides.

---

## 3. Functional Requirements

### FR1: Animated Video Generation
- **FR1.1**: Support for multiple modes (Algorithm Visualizer, Cinematic Theory, Anime Storytelling).
- **FR1.2**: Automated script generation with scene-by-scene narration and visual cues.
- **FR1.3**: Real-time browser-based video preview using Remotion Player.
- **FR1.4**: Server-side MP4 rendering and download capability.

### FR2: Academic Notes Generation
- **FR2.1**: Real-time streaming of markdown-based notes.
- **FR2.2**: Automated generation of Mermaid.js mindmaps and diagrams.
- **FR2.3**: Inclusion of interactive MCQs with instant feedback.
- **FR2.4**: Export capability to PDF and other document formats.

### FR3: Content Management & History
- **FR3.1**: Automatic saving of generated assets (Notes, Videos, Tests) to the user's history.
- **FR3.2**: Ability to re-open and re-view previously generated video scripts and notes.
- **FR3.3**: Searchable and filterable learning history.

---

## 4. Non-Functional Requirements

### NFR1: Performance & Scalability
- **Streaming**: AI responses must stream to the UI incrementally to minimize perceived latency.
- **Rendering**: Server-side video rendering must handle long-running processes (up to 5 mins) without timing out.

### NFR2: Aesthetics & UX
- **Theme**: Unified "Neon Cyberpunk" dark mode with vibrant glassmorphism effects.
- **Responsive Design**: The platform must be fully functional on Desktop, Tablet, and Mobile devices.
- **Micro-animations**: Subtle hover effects and loading states to enhance the premium feel.

### NFR3: Reliability
- **Fault Tolerance**: Automatic fallback mechanisms for broken Mermaid diagrams or failed image fetches.
- **Data Integrity**: Atomic saving of generated content to the database once the AI stream completes.

### NFR4: Security
- **API Protection**: Secure handling of API keys (Groq/OpenRouter) via server-side environment variables.
- **Auth**: Domain-restricted registration (optional) and JWT-based authentication for private history.

---

## 5. Product Roadmap
1.  **Phase 1 (Current)**: Core generation engines for videos and notes with basic history.
2.  **Phase 2**: Multi-user support with private workspaces and collaborative editing.
3.  **Phase 3**: Integration with LMS platforms (Canvas/Moodle) and advanced voiceover synthesis (ElevenLabs).
