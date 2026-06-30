const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: process.env.FIREBASE_PROJECT_ID || 'anugrah-s-projects-82289c79',
  });
}

const db = admin.firestore();

async function checkExperience() {
  try {
    const personaId = 'fullstack-developer';
    const expSnap = await db.collection('experiences')
      .where('persona_id', '==', personaId)
      .get();

    const exps = expSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    exps.sort((a, b) => {
      const timeA = a.created_at?.toDate ? a.created_at.toDate().getTime() : new Date(a.created_at).getTime();
      const timeB = b.created_at?.toDate ? b.created_at.toDate().getTime() : new Date(b.created_at).getTime();
      return timeB - timeA;
    });

    const latestExp = exps[0];
    console.log(JSON.stringify(latestExp.content, null, 2));
  } catch (error) {
    console.error('Error:', error);
  }
}

checkExperience();
