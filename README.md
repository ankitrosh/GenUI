# GenUI: Turning Conversations into Shared Understanding

**Elevator Pitch (Refined):** Turning conversations into real-time shared understanding. GenUI listens with consent, understands context through AI-powered analysis, and visualizes collective insights as dynamic, read-only UI—so teams align faster and make better decisions together.

---

## Project Overview

### Inspiration
The inspiration for this project came from a simple but persistent problem we've all experienced: **groups talk a lot, yet often leave with different understandings**. In classrooms, meetings, healthcare discussions, and community spaces, conversations are rich—but alignment is fragile. Notes are taken after the fact, decisions are remembered differently, and important context gets lost in the moment it matters most.

We wanted to explore a different question: What if the system didn't document conversations after they happened, but instead helped people think better together while they were happening?

This led us to the idea of treating the UI not as a static canvas, but as a living mirror of collective thought—one that listens with consent, understands context, and adapts in real time to support shared understanding.

### What it does
GenUI is a conversation intelligence platform that turns live conversations into shared understanding. With explicit consent, the product listens to a conversation, interprets its evolving context, and dynamically generates a read-only, adaptive UI that reflects what the group is discussing. As ideas emerge, diverge, or converge, the UI changes to match the cognitive state of the group—whether that's exploration, clarification, or decision-making.

**Core Capabilities:**
- **Captures speech input** with explicit user consent through a floating microphone button
- **Processes conversations in real time** using LLM intelligence (OpenAI GPT-4o) to extract meaning, context, and structure
- **Generates dynamic, read-only UI surfaces** using the proprietary GenUI schema—a structured, declarative format for information visualization
- **Visualizes group thinking** by displaying insights, summaries, and patterns derived from live conversation
- **Maintains session-based context** to build understanding progressively as conversations evolve

**Examples of what the UI can surface include:**
- Emerging topics and key ideas
- Points of agreement and disagreement
- Open questions and unresolved threads
- Decision summaries and next steps

The core principle is simple: **don't interrupt the conversation—augment it.**

GenUI is built for **consent-first interaction**: every participant controls their microphone, and the system treats conversation data with respect and privacy in mind.

### How we built it
GenUI is a full-stack application combining modern web technologies with AI intelligence, organized into three distinct layers:

**Conversation Layer:**
- Processes conversational input only with explicit user consent
- Uses Web Speech API for real-time speech capture and transcription
- Maintains session-based context with persistent event storage

**Understanding Layer:**
- Extracts high-level semantic signals such as topics, alignment, uncertainty, and decision intent—without diagnosing, judging, or steering the conversation
- Integrates OpenAI GPT-4o for intelligent conversation analysis and UI generation
- Implements prompt compression and token optimization for real-time responsiveness

**UI Layer (GenUI):**
- Renders a declarative, read-only interface using a custom schema
- The UI is fully data-driven and adapts based on the evolving conversation state, ensuring separation between logic, data, and presentation
- Uses React + TypeScript for type-safe, component-based rendering

**Technical Stack:**

**Frontend:**
- **React + TypeScript** for type-safe, component-based UI
- **Vite** as the build tool for fast development and optimized production builds
- **Tailwind CSS** for responsive, utility-first styling
- **Web Speech API** for real-time speech capture and transcription
- **React Router** for session-based navigation and state management

**Backend:**
- **FastAPI** for a high-performance, modern Python API
- **OpenAI GPT-4o** integration for intelligent conversation analysis and UI generation
- **SQLAlchemy** for session and event persistence
- **GenUI Schema system** for structured, read-only UI generation with declarative component definitions

**Shared Assets:**
- **genui-schema package**: A TypeScript library defining the GenUI schema, providing type safety across frontend and backend
- **WebSocket-ready architecture** for real-time updates and progressive conversation processing

We intentionally constrained the UI to be non-interactive. This design choice keeps the focus on human dialogue while allowing the system to support clarity and alignment in the background.

### Challenges we ran into
One of the biggest challenges was knowing what not to build. We had to resist turning the system into a chatbot or an active participant, and ensure the product supports human thinking rather than replacing it. Designing a UI that adapts meaningfully—without becoming distracting or overwhelming—required careful abstraction.

**Technical Challenges:**
1. **Real-time LLM responsiveness**: Balancing token optimization and prompt compression to keep LLM response times low while maintaining context fidelity
2. **UI schema consistency**: Designing a schema flexible enough for diverse conversation visualizations while strict enough to ensure reliable rendering across different information types
3. **State management at scale**: Handling incremental speech input, progressive LLM responses, and multi-surface UI updates without introducing race conditions
4. **Speech accuracy and consent**: Integrating the Web Speech API responsibly, ensuring users maintain clear control over when and what is captured
5. **Multi-surface coordination**: Managing interactions between multiple UI surfaces that update asynchronously based on different LLM insights
6. **Performance optimization**: Compressing user prompts and reducing token consumption without sacrificing semantic understanding

Another challenge was trust and consent. Listening to conversations, even for helpful purposes, demands transparency and clear boundaries. We learned that consent-first design isn't just an ethical choice—it also improves user comfort and adoption.

Finally, translating messy, real-time conversations into clean, structured representations forced us to think deeply about how humans actually reason together—not just how systems process language.

### Accomplishments that we're proud of
- **Built a production-grade LLM integration** with OpenAI, including intelligent prompt compression via TokenC and robust error handling
- **Designed the GenUI Schema**: A declarative, read-only UI specification that enables AI-driven UI generation without traditional imperative component logic
- **Implemented consent-first UX**: A clean, intuitive microphone interface that empowers users to control what data is captured
- **Created a responsive, real-time experience**: Multi-surface UI updates driven by LLM intelligence, with progressive conversation processing
- **Established strong type safety**: Shared TypeScript schema definitions across frontend and backend ensure consistency and reduce runtime errors
- **Built a scalable session model**: Session-based architecture with persistent event storage enables long-running conversations and historical analysis
- **Optimized for clarity and scannability**: Intentional UI density, hierarchy, and structure to make complex conversation insights immediately actionable

### What we learned
- **Shared understanding is not automatic—it needs support.** Groups talk a lot but often leave with different understandings without proper augmentation.
- **The most powerful role for AI in groups is often reflective, not directive.** AI works best when it mirrors and supports human thinking rather than steering it.
- **Constraints (like read-only UI and strict schemas) can unlock better design by forcing clarity.** Limiting interactivity keeps focus on human dialogue.
- **LLMs need careful prompting**: System prompts, context management, and compression strategies directly impact both quality and latency
- **UI generation is a solved problem with the right constraints**: By limiting to read-only, data-bound visualizations, we enable AI-driven UI without hallucination or unsafety risks
- **Consent and control are foundational**: Users trust systems more when they have explicit, moment-to-moment control over data capture
- **Data binding via JSON Pointers is powerful**: Decoupling UI structure from data enables flexible, reusable component designs
- **Session-based architecture scales**: Incremental event processing allows us to handle long conversations without overwhelming memory or latency
- **Type safety across boundaries matters**: Sharing TypeScript types between frontend and backend dramatically reduces integration bugs

### What's next for GenUI
This project is an early step toward tools that help people align, reason, and decide together—in education, healthcare navigation, teams, and communities. We believe the future of collaboration isn't about more features, but about better shared mental models.

**Future Roadmap:**
- **Multi-participant support**: Extend session management to handle group conversations with identified speakers and per-participant insights
- **Enhanced analytics**: Add timeline views, sentiment analysis, and decision-tracking features
- **Export and sharing**: Enable teams to export conversation insights in multiple formats (PDF, HTML, JSON) and share analysis across the organization
- **Custom LLM models**: Support for switching between different LLM providers and fine-tuned models for domain-specific conversation analysis
- **Offline and hybrid modes**: Extend the platform to work with audio files, recorded meetings, and hybrid sync scenarios
- **AI-driven action items**: Automatically extract, track, and assign action items derived from conversation context
- **Privacy-first deployment**: Deploy self-hosted versions for enterprise customers with strict data residency requirements
- **Integration with productivity tools**: Connect with Slack, Microsoft Teams, Notion, and other platforms to embed GenUI insights into existing workflows

That's the future we're building toward.

---

## Project layout
- `frontend/`: Vite + React + TypeScript + Tailwind CSS (speech controls + transcript viewer)
- `backend/`: FastAPI service with CORS enabled for the Vite dev server
- `genui-schema/`: Shared TypeScript type definitions for GenUI read-only UI generation schema

## Prerequisites
- Node.js 18+ and npm
- Python 3.11+

## Frontend (Vite + Tailwind)
```bash
cd frontend
npm install
npm install ../genui-schema  # Install shared GenUI schema package
npm run dev        # start Vite dev server (defaults to http://localhost:5173)
npm run build      # type-check + production build
npm run preview    # serve the production build locally
npm run lint       # ESLint
npm run format     # Prettier
```
- Tailwind is configured in `tailwind.config.js` and `src/index.css`. Utility-first styles are used across components.
- Aliases: `@/` points to `src/` (see `vite.config.ts`).
- The `genui-schema` package provides TypeScript types for GenUI messages and components.

## Backend (FastAPI)
```bash
cd backend
python -m venv .venv
source .venv/bin/activate
python -m pip install .
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```
- CORS allows `http://localhost:5173` by default (configure in `app/main.py` if the frontend runs elsewhere).
- Entry point: `backend/main.py` exposes `app` for ASGI servers.

## Developer experience notes
- Run `npm run lint` / `npm run format` before commits to keep the frontend consistent.
- Use `npm run build` to catch type errors early (Vite build runs `tsc -b` first).
- For backend dependency updates, edit `backend/pyproject.toml` and reinstall with `pip install -e .`.
- Environment variables: none required for the current FastAPI placeholder; add a `.env` and load with `python-dotenv` when needed.

## Scripts cheatsheet
- Frontend dev: `cd frontend && npm run dev`
- Frontend build: `cd frontend && npm run build`
- Backend dev: `cd backend && uvicorn app.main:app --reload --port 8000`
