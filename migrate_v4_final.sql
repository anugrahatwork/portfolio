-- ========================================================
-- SCRIPT MIGRASI DATABASE PERSONA OS V4 (Unified Ledger)
-- ========================================================

-- 1. Pastikan tabel activities memiliki struktur baru
ALTER TABLE activities ADD COLUMN IF NOT EXISTS event_type TEXT DEFAULT 'chat';
ALTER TABLE activities ADD COLUMN IF NOT EXISTS context JSONB DEFAULT '{}'::jsonb;

-- 2. Migrasikan relasi Activities lama ke dalam context JSONB
-- Mengambil persona_id dan project_id dari tabel join lama
UPDATE activities a
SET context = jsonb_build_object(
    'persona_id', (SELECT persona_id FROM activity_personas WHERE activity_id = a.id LIMIT 1),
    'project_id', (SELECT project_id FROM activity_projects WHERE activity_id = a.id LIMIT 1)
)
WHERE context = '{}'::jsonb;

-- 3. UNIFIKASI: Pindahkan data dari Learning Logs ke Activities
-- Ini akan membuat satu aliran timeline yang menyatu
INSERT INTO activities (content, visibility, created_at, event_type, context)
SELECT 
    l.content, 
    l.visibility, 
    l.created_at, 
    'learning_reflection',
    jsonb_build_object(
        'persona_id', (SELECT persona_id FROM learning_log_personas WHERE log_id = l.id LIMIT 1),
        'project_id', (SELECT project_id FROM learning_log_projects WHERE log_id = l.id LIMIT 1)
    )
FROM learning_logs l;

-- 4. PEMBERSIHAN (Cleanup): Hapus tabel-tabel usang
DROP TABLE IF EXISTS activity_personas;
DROP TABLE IF EXISTS activity_projects;
DROP TABLE IF EXISTS learning_log_personas;
DROP TABLE IF EXISTS learning_log_projects;
DROP TABLE IF EXISTS learning_logs;

-- 5. UPGRADE POLICY: Pastikan Admin bisa insert dengan skema baru
DROP POLICY IF EXISTS "Admins can insert activities" ON activities;
CREATE POLICY "Admins can insert activities" ON activities 
FOR INSERT TO authenticated 
WITH CHECK (true);

-- Catatan: Setelah ini dijalankan, tabel 'activities' adalah
-- satu-satunya tempat penyimpanan untuk semua jenis log/chat/aktivitas.
