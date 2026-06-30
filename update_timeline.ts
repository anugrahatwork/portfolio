const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: process.env.FIREBASE_PROJECT_ID || 'anugrah-s-projects-82289c79',
  });
}

const db = admin.firestore();

async function updateExperience() {
  try {
    const personaId = 'fullstack-developer';
    const expSnap = await db.collection('experiences')
      .where('persona_id', '==', personaId)
      .get();

    if (expSnap.empty) {
      console.log('No experiences found for', personaId);
      return;
    }

    const exps = expSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    exps.sort((a, b) => {
      const timeA = a.created_at?.toDate ? a.created_at.toDate().getTime() : new Date(a.created_at).getTime();
      const timeB = b.created_at?.toDate ? b.created_at.toDate().getTime() : new Date(b.created_at).getTime();
      return timeB - timeA;
    });

    const latestExp = exps[0];
    const content = latestExp.content;
    let updated = false;

    for (let i = 0; i < content.length; i++) {
      const companyData = content[i];
      if (typeof companyData === 'string') continue;

      if (companyData.company.toLowerCase().includes('kredin')) {
        companyData.company = 'PT Asuransi Kredin';
        companyData.time = 'Jan 2022 - Present';
        updated = true;
      }
      
      if (companyData.company.toLowerCase().includes('anugrahatwork')) {
        companyData.company = 'anugrahatwork.com';
        companyData.time = 'Jun 2026 - Present';
        updated = true;
      }
    }

    if (updated) {
      await db.collection('experiences').doc(latestExp.id).update({ content });
      console.log('Successfully updated the timelines!');
    } else {
      console.log('Could not find matching companies. Available content:', JSON.stringify(content, null, 2));
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

updateExperience();
