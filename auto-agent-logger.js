const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { insertLog, getActiveTaskDetails } = require('./lib/agent-helper');

const CONVERSATION_ID = '315430ac-659b-46f6-ad11-1b3cd6c25041';
const TRANSCRIPT_PATH = `C:\\Users\\dikar\\.gemini\\antigravity-cli\\brain\\${CONVERSATION_ID}\\.system_generated\\logs\\transcript.jsonl`;
const STATE_PATH = `C:\\Users\\dikar\\.gemini\\antigravity-cli\\brain\\${CONVERSATION_ID}\\scratch\\auto_logger_state.json`;

let state = {
  lastSyncLine: 0,
  lastSyncFileSize: 0,
  loggedFiles: {}, // filepath -> timestamp
  lastActiveTaskId: null
};

// Ensure scratch directory exists and load state
const scratchDir = path.dirname(STATE_PATH);
try {
  if (!fs.existsSync(scratchDir)) {
    fs.mkdirSync(scratchDir, { recursive: true });
  }
  if (fs.existsSync(STATE_PATH)) {
    state = JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));
  }
} catch (e) {
  console.log('Using in-memory state');
}

function saveState() {
  try {
    fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2), 'utf8');
  } catch (e) {
    // Ignore
  }
}

const IGNORED_FILES = [
  '.active_agent_task',
  'auto-agent-logger.js',
  'auto_logger_state.json',
  'task.md',
  'walkthrough.md',
  'implementation_plan.md',
  'previous_session_summary.md',
  'package-lock.json',
  'node_modules',
  '.git',
  '.idea',
  '.next'
];

function isIgnoredFile(filePath) {
  const normalized = filePath.replace(/\\/g, '/');
  const parts = normalized.split('/');
  return IGNORED_FILES.some(ignored => {
    return parts.includes(ignored) || parts.some(p => p.endsWith(ignored)) || normalized.endsWith(ignored);
  });
}

// 1. Sync Transcripts
async function syncTranscripts(taskDetails) {
  try {
    if (!fs.existsSync(TRANSCRIPT_PATH)) return;

    const stats = fs.statSync(TRANSCRIPT_PATH);
    if (stats.size === state.lastSyncFileSize) return; // No changes

    const content = fs.readFileSync(TRANSCRIPT_PATH, 'utf8');
    const lines = content.split('\n').filter(l => l.trim().length > 0);
    
    // Handle transcript compaction/truncation reset
    if (lines.length < state.lastSyncLine) {
      state.lastSyncLine = 0;
    }

    if (lines.length > state.lastSyncLine) {
      const startLineIndex = taskDetails ? taskDetails.startLineIndex : lines.length;

      for (let i = state.lastSyncLine; i < lines.length; i++) {
        // Skip logging if the line was written before the task started
        if (i < startLineIndex || !taskDetails) {
          continue;
        }

        const lineObj = JSON.parse(lines[i]);
        const { type, content: text, tool_calls } = lineObj;

        if (type === 'USER_INPUT' && text) {
          await insertLog(`👤 [Dev Session] User asked: "${text.substring(0, 150)}${text.length > 150 ? '...' : ''}"`);
        } else if (type === 'PLANNER_RESPONSE') {
          if (text) {
            await insertLog(`🤖 [Dev Session] Antigravity: "${text.substring(0, 150)}${text.length > 150 ? '...' : ''}"`);
          }
          if (tool_calls && tool_calls.length > 0) {
            const toolNames = tool_calls.map(tc => {
              if (tc.name === 'run_command' && tc.args && tc.args.CommandLine) {
                return `run_command ("${tc.args.CommandLine.split(' ')[0]}...")`;
              }
              return tc.name;
            });
            await insertLog(`🔧 [Dev Session] Executed tools: ${toolNames.join(', ')}`);
          }
        }
      }
      state.lastSyncLine = lines.length;
      state.lastSyncFileSize = stats.size;
      saveState();
    }
  } catch (e) {
    console.error('Error syncing transcripts:', e);
  }
}

// 2. Watch File/Git Changes
async function checkGitChanges(taskDetails) {
  if (!taskDetails) return;

  try {
    let status = '';
    try {
      status = execSync('git status --porcelain', { encoding: 'utf8' });
    } catch (e) {
      return;
    }

    const lines = status.split('\n').filter(l => l.trim().length > 0);
    const now = Date.now();
    const startedAt = taskDetails.startedAt;

    // Reset debounce list if task ID changed
    if (taskDetails.id !== state.lastActiveTaskId) {
      state.loggedFiles = {};
      state.lastActiveTaskId = taskDetails.id;
      saveState();
    }

    for (const line of lines) {
      const statusToken = line.slice(0, 2).trim();
      const filePath = line.slice(3).trim();

      if (!filePath) continue;

      if (isIgnoredFile(filePath)) {
        continue;
      }

      let fileMtime = 0;
      const fullPath = path.join(__dirname, filePath);
      try {
        fileMtime = fs.statSync(fullPath).mtimeMs;
      } catch (e) {
        try {
          fileMtime = fs.statSync(path.dirname(fullPath)).mtimeMs;
        } catch (err) {}
      }

      if (fileMtime < startedAt) {
        continue;
      }

      const lastLogged = state.loggedFiles[filePath] || 0;
      if (now - lastLogged > 60000) {
        let action = 'modified';
        if (statusToken === '??') action = 'created';
        if (statusToken === 'D') action = 'deleted';

        await insertLog(`📝 [Auto-Log] File ${action}: "${filePath}"`);
        state.loggedFiles[filePath] = now;
        saveState();
      }
    }
  } catch (e) {
    console.error('Error checking git changes:', e);
  }
}

// Main background loop
async function runLoop() {
  console.log('Background Auto-Logger Started (Optimized & Cleaned).');
  while (true) {
    const taskDetails = getActiveTaskDetails();
    await syncTranscripts(taskDetails);
    await checkGitChanges(taskDetails);
    await new Promise(resolve => setTimeout(resolve, 7000));
  }
}

runLoop();
