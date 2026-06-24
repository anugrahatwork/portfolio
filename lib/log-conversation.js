const LOCAL_API_URL = "http://localhost:3000/api/activities";

async function logDevConversation(sender, text) {
  const content = sender === 'User' 
    ? `👤 [Dev Chat] User: "${text}"`
    : `🤖 [Dev Chat] Antigravity: ${text}`;

  const contextPayload = {
    persona_id: 'fullstack-developer',
    project_id: 'portfolio-project',
    is_agent: true,
    agent_name: 'Antigravity',
    dev_chat: true
  };

  try {
    const res = await fetch(LOCAL_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        content: content,
        visibility: 'public',
        event_type: 'agent_log',
        context: contextPayload
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('Failed to log dev chat via local API:', res.status, errText);
    } else {
      console.log('Logged Dev Chat successfully:', content);
    }
  } catch (error) {
    // Ignore when dev server is offline
  }
}

const args = process.argv.slice(2);
if (args.length >= 2) {
  const sender = args[0]; // 'User' or 'Agent'
  const text = args.slice(1).join(' ');
  logDevConversation(sender, text);
}
