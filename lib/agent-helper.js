const fs = require('fs');
const path = require('path');

const ACTIVE_TASK_FILE = path.join(__dirname, '..', '.active_agent_task');
const LOCAL_API_URL = "http://localhost:3000/api/activities";

function getActiveTaskDetails() {
  try {
    if (fs.existsSync(ACTIVE_TASK_FILE)) {
      const content = fs.readFileSync(ACTIVE_TASK_FILE, 'utf8').trim();
      if (!content) return null;
      try {
        const parsed = JSON.parse(content);
        return {
          id: parsed.id || null,
          startedAt: parsed.startedAt || null,
          startLineIndex: parsed.startLineIndex !== undefined ? parsed.startLineIndex : 0
        };
      } catch (e) {
        const stats = fs.statSync(ACTIVE_TASK_FILE);
        return {
          id: content,
          startedAt: stats.mtimeMs,
          startLineIndex: 0
        };
      }
    }
  } catch (e) {
    // Ignore
  }
  return null;
}

function getActiveTaskId() {
  const details = getActiveTaskDetails();
  return details ? details.id : null;
}

async function insertLog(message, eventType = 'agent_log', projectId = 'portfolio-project', taskId = null) {
  const activeTaskId = taskId || getActiveTaskId();

  const contextPayload = {
    persona_id: 'fullstack-developer',
    project_id: projectId,
    is_agent: true,
    agent_name: 'Antigravity',
    dev_session_autolog: true
  };

  if (activeTaskId) {
    contextPayload.task_id = activeTaskId;
  }

  try {
    const res = await fetch(LOCAL_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        content: message,
        visibility: 'public',
        event_type: eventType,
        context: contextPayload
      })
    });

    if (!res.ok) {
      const txt = await res.text();
      console.error('Failed to insert log via local API:', res.status, txt);
    } else {
      console.log('Logged successfully via local API:', message);
    }
  } catch (e) {
    // Ignore database insertion or local network errors when dev server is offline
  }
}

module.exports = {
  localApiUrl: LOCAL_API_URL,
  getActiveTaskId,
  getActiveTaskDetails,
  insertLog,
  ACTIVE_TASK_FILE
};
