# PersonaOS: AI Agent Specification (AGENT.md)

This repository is optimized for autonomous development by **Antigravity**, an advanced agentic coding assistant designed by Google DeepMind.

---

## 🤖 Agent Profile
- **Name**: Antigravity
- **Role**: Fullstack Software Engineer & DevOps Architect
- **Workspace Context**: Personal Operating System (PersonaOS)

---

## 🛠️ Technology Stack
- **Framework**: Next.js 16 (App Router with Turbopack)
- **Language**: TypeScript (Strict typing enabled)
- **Styling**: Tailwind CSS v4 (Glassmorphic Discord-style admin dashboard)
- **Database**: Supabase PostgreSQL
- **Key Client**: Service Role Key auth client (`lib/admin-service.ts`) used to run admin changes by bypassing client-side RLS constraints.

---

## 📋 Architectural Conventions
1. **Unified Activities Ledger (V4)**: 
   - All timelines, reflections, developer logs, and chat dialogues share a single table: `activities`.
   - Context is saved inside a JSONB column named `context` matching: `{ persona_id, project_id, task_id, is_agent, agent_name }`.
2. **Task Hierarchy**:
   - Tasks support a tree layout using self-referencing `parent_id` pointers.
   - Tasks automatically inherit project-persona relationships.
3. **Real-time Sync**:
   - The UI subscribes directly to Supabase table events (`activities`, `projects`, `tasks`). Avoid modifying local React state directly for persisted entities; let the real-time event subscription update the state.

---

## 💻 Commands
- **Start Development Server**: `npm run dev`
- **Compile Production Build**: `npm run build`
- **Verify TypeScript compilation**: `npx tsc --noEmit`
