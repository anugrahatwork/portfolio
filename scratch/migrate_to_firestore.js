/**
 * Migration Script: Supabase (Postgres) -> Firebase (Cloud Firestore)
 * 
 * This script connects to Supabase using your credentials in `.env.local`,
 * extracts the data, unifies the schema as specified in `migrate_v4_final.sql`
 * (merging learning logs into activities and converting join tables to list fields),
 * and uploads everything to Firebase Firestore.
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

// 1. Load environment variables manually from .env.local
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (!fs.existsSync(envPath)) {
    console.error('Error: .env.local file not found at:', envPath);
    console.error('Please create it and populate your credentials first.');
    process.exit(1);
  }
  const content = fs.readFileSync(envPath, 'utf8');
  const env = {};
  content.split(/\r?\n/).forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const index = trimmed.indexOf('=');
    if (index > 0) {
      const key = trimmed.substring(0, index).trim();
      let val = trimmed.substring(index + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.substring(1, val.length - 1);
      }
      env[key] = val;
    }
  });
  return env;
}

const env = loadEnv();

// Extract Supabase Config
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: Supabase configuration (NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY) is missing in .env.local.');
  process.exit(1);
}

// Extract Firebase Config
const firebaseProjectId = env.FIREBASE_PROJECT_ID || env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const firebaseClientEmail = env.FIREBASE_CLIENT_EMAIL;
let firebasePrivateKey = env.FIREBASE_PRIVATE_KEY;

const isFirebaseConfigured = firebaseProjectId && firebaseClientEmail && firebasePrivateKey && !firebaseProjectId.includes('your_project_id');

if (!isFirebaseConfigured) {
  console.warn('\n========================================================================');
  console.warn('WARNING: Firebase admin credentials in .env.local are not fully configured.');
  console.warn('We will run a DRY RUN migration: data will be fetched from Supabase,');
  console.warn('processed, and written to local JSON files in the "./scratch" directory.');
  console.warn('To perform the actual upload to Firestore, configure the Firebase keys in .env.local.');
  console.warn('========================================================================\n');
}

// 2. Initialize Supabase
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
});

// 3. Initialize Firebase Admin (if credentials exist)
let db;
if (isFirebaseConfigured) {
  try {
    firebasePrivateKey = firebasePrivateKey.replace(/\\n/g, '\n');
    initializeApp({
      credential: cert({
        projectId: firebaseProjectId,
        clientEmail: firebaseClientEmail,
        privateKey: firebasePrivateKey,
      })
    });
    db = getFirestore();
    console.log('Successfully initialized Firebase Admin SDK.');
  } catch (error) {
    console.error('Error initializing Firebase Admin SDK:', error.message);
    console.warn('Falling back to DRY RUN mode.');
    db = null;
  }
}

// Helper to write to Firestore or save to local JSON file
async function saveDocuments(collectionName, documents) {
  console.log(`Processing ${documents.length} documents for collection "${collectionName}"...`);
  
  // Save to local JSON file first for audit
  const scratchDir = path.join(__dirname);
  if (!fs.existsSync(scratchDir)) {
    fs.mkdirSync(scratchDir, { recursive: true });
  }
  const jsonPath = path.join(scratchDir, `${collectionName}.json`);
  fs.writeFileSync(jsonPath, JSON.stringify(documents, null, 2), 'utf8');
  console.log(`Saved local copy of data to: ${jsonPath}`);

  if (!db) {
    console.log(`[DRY RUN] Would write ${documents.length} documents to Firestore collection "${collectionName}".`);
    return;
  }

  // Upload to Firestore in batches
  const batch = db.batch();
  let count = 0;
  for (const doc of documents) {
    // If the doc has a specific ID (like UUID or string code), use it. Otherwise auto-generate.
    const docRef = doc.id ? db.collection(collectionName).doc(doc.id) : db.collection(collectionName).doc();
    
    // Copy doc to avoid mutating original, and delete id field since it's the document key
    const data = { ...doc };
    delete data.id;

    batch.set(docRef, data);
    count++;
    
    if (count % 500 === 0) {
      await batch.commit();
      console.log(`Uploaded batch of 500 documents to ${collectionName}...`);
    }
  }
  
  if (count % 500 !== 0) {
    await batch.commit();
  }
  console.log(`Successfully uploaded all ${count} documents to Firestore collection "${collectionName}".`);
}

// Helper for subcollection items (e.g. persona evolutions)
async function saveSubcollectionDocuments(parentCollection, parentDocId, subcollectionName, documents) {
  console.log(`Processing ${documents.length} subcollection items for "/${parentCollection}/${parentDocId}/${subcollectionName}"...`);

  if (!db) {
    console.log(`[DRY RUN] Would write ${documents.length} subcollection documents to "/${parentCollection}/${parentDocId}/${subcollectionName}".`);
    return;
  }

  const batch = db.batch();
  for (const doc of documents) {
    const docRef = doc.id 
      ? db.collection(parentCollection).doc(parentDocId).collection(subcollectionName).doc(doc.id)
      : db.collection(parentCollection).doc(parentDocId).collection(subcollectionName).doc();
    
    const data = { ...doc };
    delete data.id;
    batch.set(docRef, data);
  }
  await batch.commit();
  console.log(`Successfully uploaded subcollection items for "/${parentCollection}/${parentDocId}/${subcollectionName}".`);
}

async function runMigration() {
  try {
    // Helper helper to handle missing tables query
    async function safeFetch(tableName) {
      try {
        const { data, error } = await supabase.from(tableName).select('*');
        if (error) {
          console.warn(`Warning reading ${tableName}:`, error.message);
          return null;
        }
        return data;
      } catch (e) {
        console.warn(`Exception reading ${tableName}:`, e.message);
        return null;
      }
    }

    // ----------------------------------------------------
    // 1. PROFILE MIGRATION
    // ----------------------------------------------------
    console.log('\n--- Migrating Profiles ---');
    const profiles = await safeFetch('profiles');
    await saveDocuments('profiles', profiles || []);

    // ----------------------------------------------------
    // 2. PERSONAS & EVOLUTIONS MIGRATION
    // ----------------------------------------------------
    console.log('\n--- Migrating Personas & Evolutions ---');
    const personas = await safeFetch('personas');
    const evolutions = await safeFetch('persona_evolutions');

    await saveDocuments('personas', personas || []);

    if (personas && personas.length > 0) {
      for (const persona of personas) {
        const personaEvos = (evolutions || []).filter(e => e.persona_id === persona.id);
        if (personaEvos.length > 0) {
          // Remove persona_id since it's represented by the path hierarchy
          const evosData = personaEvos.map(e => {
            const copy = { ...e };
            delete copy.persona_id;
            return copy;
          });
          await saveSubcollectionDocuments('personas', persona.id, 'persona_evolutions', evosData);
        }
      }
    }

    // ----------------------------------------------------
    // 3. PROJECTS MIGRATION (with joint personas)
    // ----------------------------------------------------
    console.log('\n--- Migrating Projects ---');
    const projects = await safeFetch('projects');
    const projPersonas = await safeFetch('project_personas');

    const projectsWithPersonas = (projects || []).map(p => {
      const related = (projPersonas || [])
        .filter(pp => pp.project_id === p.id)
        .map(pp => pp.persona_id);
      return {
        ...p,
        relatedPersonas: related
      };
    });
    await saveDocuments('projects', projectsWithPersonas);

    // ----------------------------------------------------
    // 4. FOCUS TIMELINE PHASES MIGRATION
    // ----------------------------------------------------
    console.log('\n--- Migrating Focus Timeline Phases ---');
    const phases = await safeFetch('focus_timeline_phases');
    const phasePersonas = await safeFetch('phase_personas');
    const phaseProjects = await safeFetch('phase_projects');

    const mappedPhases = (phases || []).map(ph => {
      const connectedPersonas = (phasePersonas || [])
        .filter(pp => pp.phase_id === ph.id)
        .map(pp => pp.persona_id);
      
      const influencedProjects = (phaseProjects || [])
        .filter(pp => pp.phase_id === ph.id)
        .map(pp => pp.project_id);

      return {
        ...ph,
        connectedPersonas,
        influencedProjects
      };
    });
    await saveDocuments('focus_timeline_phases', mappedPhases);

    // ----------------------------------------------------
    // 5. TASKS MIGRATION
    // ----------------------------------------------------
    console.log('\n--- Migrating Tasks ---');
    const tasks = await safeFetch('tasks');
    await saveDocuments('tasks', tasks || []);

    // ----------------------------------------------------
    // 6. ACTIVITIES & UNIFIED LEARNING LOGS MIGRATION
    // ----------------------------------------------------
    console.log('\n--- Migrating Activities & Unified Learning Logs ---');
    
    // Read original activities
    const activities = await safeFetch('activities');
    const actPersonas = await safeFetch('activity_personas');
    const actProjects = await safeFetch('activity_projects');

    const processedActivities = (activities || []).map(a => {
      let event_type = a.event_type || 'chat';
      let context = a.context || {};

      // If context is empty and join tables exist, rebuild it
      if (Object.keys(context).length === 0) {
        const personaRel = (actPersonas || []).find(ap => ap.activity_id === a.id);
        const projRel = (actProjects || []).find(ap => ap.activity_id === a.id);
        
        if (personaRel) context.persona_id = personaRel.persona_id;
        if (projRel) context.project_id = projRel.project_id;
      }

      return {
        id: a.id,
        content: a.content,
        visibility: a.visibility || 'public',
        created_at: a.created_at,
        event_type,
        context
      };
    });

    // Unified: Fetch and merge learning logs if they exist as a separate table
    const learningLogs = await safeFetch('learning_logs');

    if (learningLogs && learningLogs.length > 0) {
      console.log(`Unifying ${learningLogs.length} learning logs into activities collection...`);
      const logPersonas = await safeFetch('learning_log_personas');
      const logProjects = await safeFetch('learning_log_projects');

      for (const log of learningLogs) {
        const context = {};
        const personaRel = (logPersonas || []).find(lp => lp.log_id === log.id);
        const projRel = (logProjects || []).find(lp => lp.log_id === log.id);

        if (personaRel) context.persona_id = personaRel.persona_id;
        if (projRel) context.project_id = projRel.project_id;

        processedActivities.push({
          id: log.id,
          content: log.content,
          visibility: log.visibility || 'public',
          created_at: log.created_at,
          event_type: 'learning_reflection',
          context
        });
      }
    }

    await saveDocuments('activities', processedActivities);

    // ----------------------------------------------------
    // 7. USER ROLES MIGRATION
    // ----------------------------------------------------
    console.log('\n--- Migrating User Roles ---');
    const roles = await safeFetch('user_roles');
    if (roles && roles.length > 0) {
      const mappedRoles = roles.map(r => ({
        id: r.user_id, // Document ID is the user_id
        role: r.role,
        created_at: r.created_at
      }));
      await saveDocuments('user_roles', mappedRoles);

      console.log('\n========================================================================');
      console.log('NOTE ON USER ROLES & ADMIN LOGIN:');
      console.log('Firebase Auth assigns new UIDs to users on registration.');
      console.log('To access the admin panel, you must:');
      console.log('1. Register a user in your Firebase project.');
      console.log('2. Go to the Firestore Console -> "user_roles" collection.');
      console.log('3. Create a document with the Document ID set to the user\'s Firebase UID.');
      console.log('4. Add a field: role (string) = "root".');
      console.log('========================================================================\n');
    }

    console.log('\nMigration run completed successfully!');
  } catch (error) {
    console.error('\nMigration failed with error:', error);
  }
}

// Run the script
runMigration();
