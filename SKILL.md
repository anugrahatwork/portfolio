# Agent Skill: Automated Activity Logger (SKILL.md)

This document describes the automated background logging capability implemented for the PersonaOS project.

---

## 🎯 Purpose
Automatically capture and record all developer-agent activity—such as conversation dialogues, tool executions, and codebase file edits—directly to the Supabase unified activities ledger. This ensures that the portfolio dashboard shows real-time progress of AI construction logs.

---

## 🛠️ Skill Details
- **Skill Name**: `auto-agent-logger`
- **Location**: `auto-agent-logger.js`
- **Execution Mode**: Continuous background service (node process)

### Features
1. **Dialogue Persistence**: Reads `transcript.jsonl` dynamically. Extracts and persists user prompt dialogue and agent replies to the database.
2. **Auto File-Change Detector**: Inspects `git status --porcelain` to auto-detect any added, updated, or removed files and logs them immediately to the `activities` feed.
3. **Task State Preservation**: Saves processing state (last sync lines, file check hashes) to a local scratch file (`auto_logger_state.json`) to prevent duplicate inserts upon process restarts.

---

## 💻 Management Commands
- **Start Logger**: `node auto-agent-logger.js` (Run in background)
- **Check Status**: Use `manage_task` or check dashboard timeline updates.
<!-- Auto-logged task-based verification hook -->
