# Setup Guide: Framework-Agnostic Developer Activity Logger (AUTO_LOGGER_SETUP.md)

The developer-agent activity logger is a **fully framework-independent Node.js process**. It runs completely outside of any specific web framework (such as Next.js, React, or Angular) and can be used in **any project repository** (e.g., Python, Spring Boot, Go, Java, Rust, Laravel) as long as Node.js is installed on your local development machine.

---

## 📋 Prerequisites

### 1. Database Schema
Your target Supabase project must contain the following table structures for activities and tasks:

```sql
-- 1. Tasks Table (with hierarchical self-reference)
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    status TEXT CHECK (status IN ('todo', 'in_progress', 'done')) DEFAULT 'todo',
    project_id TEXT NOT NULL,
    parent_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. Activities Table (with JSONB context)
CREATE TABLE activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content TEXT NOT NULL,
    visibility TEXT CHECK (visibility IN ('public', 'private', 'draft')) DEFAULT 'public',
    event_type TEXT CHECK (event_type IN ('chat', 'milestone', 'learning_reflection', 'system_alert', 'agent_log')) DEFAULT 'chat',
    context JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

-- 4. Enable Read Access Policies (Example)
CREATE POLICY "Allow public read tasks" ON tasks FOR SELECT USING (true);
CREATE POLICY "Allow public read activities" ON activities FOR SELECT USING (true);
```

### 2. Environment
- Node.js version **18.0.0** or higher must be installed locally on your system.
- Git initialized in the target project directory (`git init`).

---

## 🚚 Installation Steps

### Step 1: Copy Logging files
Copy the following three files from this repository into your new project:

1. **Helper Library**: Copy `lib/agent-helper.js` to your target project's `lib/agent-helper.js`.
2. **CLI Logger**: Copy `lib/agent-logger.js` to your target project's `lib/agent-logger.js`.
3. **Background Watcher**: Copy `auto-agent-logger.js` to your target project's root folder `auto-agent-logger.js`.

---

### Step 2: Configure Environment Variables
The logging scripts automatically seek credentials by looking for `.env.local` or `.env` in the root of the project, or fallback directly to your system shell environment variables.

Create a `.env` file in the root of your target project:

```env
# Supabase API Credentials
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-secret-key
```

*⚠️ **Security Note**: Never commit your `SUPABASE_SERVICE_ROLE_KEY` to public version control (add `.env` to `.gitignore`).*

---

### Step 3: Match your Conversation/Session ID (Optional)
In your target project's root `auto-agent-logger.js` file, replace the `CONVERSATION_ID` constant (at the top) with your active AI agent conversation UUID. This ensures the logger resolves the correct transcript log path:

```javascript
const CONVERSATION_ID = 'your-new-conversation-uuid';
```

---

## 💻 Usage & Commands

You run these commands directly from your local terminal. Since the script uses native Node.js and system shell commands, it operates independently of whatever application code you write.

### 1. Run the Background Watcher
Start the background daemon. It will watch for git file modifications and transcripts in a loop every 7 seconds, auto-syncing them to Supabase:

```bash
node auto-agent-logger.js
```
*(Tip: In production environments, run this via a process manager like PM2: `pm2 start auto-agent-logger.js`)*

---

### 2. Manage Coding Tasks

#### A. Start a New Task
When you start working on a feature, notify the CLI. This registers the task as `in_progress` in Supabase and scopes all subsequent auto-detected file changes and transcripts to it:
```bash
node lib/agent-logger.js --start-task "Refactoring Auth Module" "your-project-slug"
```

#### B. Send Scoped Comments / Manual Logs
Log a manual milestone message under the active task:
```bash
node lib/agent-logger.js "🤖 [Antigravity] Successfully completed unit tests for database."
```

#### C. Complete the Task
When you finish your work, finalize the task. This changes the status in Supabase to `done` and clears the active task tracker pointer:
```bash
node lib/agent-logger.js --complete-task
```
