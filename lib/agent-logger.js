const fs = require('fs');
const path = require('path');
const { getActiveTaskId, insertLog, ACTIVE_TASK_FILE } = require('./agent-helper');

const TASKS_API_URL = "http://localhost:3000/api/tasks";

function getTranscriptLineCount() {
  const TRANSCRIPT_PATH = `C:\\Users\\dikar\\.gemini\\antigravity-cli\\brain\\315430ac-659b-46f6-ad11-1b3cd6c25041\\.system_generated\\logs\\transcript.jsonl`;
  try {
    if (fs.existsSync(TRANSCRIPT_PATH)) {
      const content = fs.readFileSync(TRANSCRIPT_PATH, 'utf8');
      return content.split('\n').filter(l => l.trim().length > 0).length;
    }
  } catch (e) {
    // Ignore
  }
  return 0;
}

async function startTask(title, projectId = 'portfolio-project') {
  try {
    const res = await fetch(TASKS_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: title,
        project_id: projectId,
        description: `Task created and tracked automatically by developer agent.`
      })
    });

    if (!res.ok) {
      const txt = await res.text();
      console.error('Failed to create task via API:', res.status, txt);
      return;
    }

    const json = await res.json();
    const task = json.data;
    const startLineIndex = getTranscriptLineCount();

    fs.writeFileSync(ACTIVE_TASK_FILE, JSON.stringify({
      id: task.id,
      startedAt: Date.now(),
      startLineIndex: startLineIndex
    }), 'utf8');

    console.log(`Successfully started task: "${task.title}" (ID: ${task.id})`);
    
    // Log initial message scoped to task
    await insertLog(`🤖 [Antigravity] Started task: "${task.title}"`, 'agent_log', projectId, task.id);
  } catch (e) {
    console.error('Error starting task:', e);
  }
}

async function completeTask() {
  const taskId = getActiveTaskId();
  if (!taskId) {
    console.error('No active task found to complete.');
    return;
  }

  try {
    const res = await fetch(TASKS_API_URL, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        id: taskId,
        status: 'done'
      })
    });

    if (!res.ok) {
      const txt = await res.text();
      console.error('Failed to update task status via API:', res.status, txt);
      return;
    }

    const json = await res.json();
    const task = json.data;

    // Log task completion message scoped to task
    await insertLog(`🤖 [Antigravity] Completed task: "${task?.title || 'Active Task'}"`, 'agent_log', task?.project_id || 'portfolio-project', taskId);

    // Remove active task file
    if (fs.existsSync(ACTIVE_TASK_FILE)) {
      fs.unlinkSync(ACTIVE_TASK_FILE);
    }

    console.log(`Successfully completed task: "${task?.title || 'Active Task'}"`);
  } catch (e) {
    console.error('Error completing task:', e);
  }
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.log('Usage: node lib/agent-logger.js [message | --start-task "title" | --complete-task]');
    return;
  }

  if (args[0] === '--start-task' || args[0] === '--create-task') {
    const title = args[1];
    const proj = args[2] || 'portfolio-project';
    if (!title) {
      console.error('Task title required.');
      return;
    }
    await startTask(title, proj);
  } else if (args[0] === '--complete-task') {
    await completeTask();
  } else {
    const msg = args.join(' ');
    await insertLog(msg);
  }
}

if (require.main === module) {
  main();
}

module.exports = { logAgentAction: insertLog };
