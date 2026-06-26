const apiKey = 'ak_live_d0098d36c22fdbf0d66683e564558cb6843ac30f137a6144';
const baseUrl = 'http://localhost:3000';

async function test() {
  try {
    console.log('--- 1. Testing GET /api/portfolio/projects ---');
    const getProjectsRes = await fetch(`${baseUrl}/api/portfolio/projects`);
    console.log('GET projects Status:', getProjectsRes.status);
    console.log('GET projects Response:', await getProjectsRes.json());

    console.log('\n--- 2. Testing POST /api/portfolio/projects ---');
    const projectPayload = {
      name: 'Japanese Learning App',
      slug: 'japanese-app-test',
      description: 'A lightweight application designed for tracking core Japanese learning sessions.',
      techStack: ['Angular', 'Supabase', 'GCP']
    };
    const postProjectRes = await fetch(`${baseUrl}/api/portfolio/projects`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey
      },
      body: JSON.stringify(projectPayload)
    });
    console.log('POST project Status:', postProjectRes.status);
    console.log('POST project Response:', await postProjectRes.json());

    console.log('\n--- 3. Testing POST /api/portfolio/tasks ---');
    const taskPayload = {
      projectId: 'japanese-app-test',
      name: 'Implement Core Authentication System',
      status: 'complete'
    };
    const postTaskRes = await fetch(`${baseUrl}/api/portfolio/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey
      },
      body: JSON.stringify(taskPayload)
    });
    console.log('POST task Status:', postTaskRes.status);
    const postTaskData = await postTaskRes.json();
    console.log('POST task Response:', postTaskData);
    const createdTaskId = postTaskData.id;

    console.log('\n--- 4. Testing GET /api/portfolio/tasks?projectId=japanese-app-test ---');
    const getTasksRes = await fetch(`${baseUrl}/api/portfolio/tasks?projectId=japanese-app-test`);
    console.log('GET tasks Status:', getTasksRes.status);
    console.log('GET tasks Response:', await getTasksRes.json());

    if (createdTaskId) {
      console.log('\n--- 5. Testing POST /api/portfolio/logs (Bulk Stream Format) ---');
      const logsPayload = {
        projectId: 'japanese-app-test',
        taskId: createdTaskId,
        logs: [
          {
            message: 'Configured Nginx reverse proxy configurations for secure cluster routing',
            timestamp: new Date().toISOString()
          },
          {
            message: 'Refactored Angular FormArray manipulation layers inside dynamic modal views',
            timestamp: new Date().toISOString()
          }
        ]
      };
      const postLogsRes = await fetch(`${baseUrl}/api/portfolio/logs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey
        },
        body: JSON.stringify(logsPayload)
      });
      console.log('POST logs Status:', postLogsRes.status);
      console.log('POST logs Response:', await postLogsRes.json());
    }

  } catch (err) {
    console.error('Test script failed with error:', err);
  }
}

test();
