-- 1. Tambahkan kolom baru ke activities
ALTER TABLE activities ADD COLUMN IF NOT EXISTS event_type TEXT DEFAULT 'chat';
ALTER TABLE activities ADD COLUMN IF NOT EXISTS context JSONB DEFAULT '{}'::jsonb;

-- 2. Migrasi data lama (Opsional: mencoba memindahkan relasi lama ke context JSON)
-- Ini berasumsi kita ingin menyelamatkan data yang sudah ada di tabel join
UPDATE activities a
SET context = jsonb_build_object(
    'persona_id', (SELECT persona_id FROM activity_personas WHERE activity_id = a.id LIMIT 1),
    'project_id', (SELECT project_id FROM activity_projects WHERE activity_id = a.id LIMIT 1)
)
WHERE EXISTS (SELECT 1 FROM activity_personas WHERE activity_id = a.id)
   OR EXISTS (SELECT 1 FROM activity_projects WHERE activity_id = a.id);

-- 3. Hapus tabel relasi yang sudah usang
DROP TABLE IF EXISTS activity_personas;
DROP TABLE IF EXISTS activity_projects;

-- 4. Update Policy (Opsional: pastikan admin bisa manage kolom baru)
-- Kebijakan SELECT untuk Admin sudah ada di file utama, 
-- tapi pastikan INSERT mengizinkan kolom baru.
DROP POLICY IF EXISTS "Admins can insert activities" ON activities;
CREATE POLICY "Admins can insert activities" ON activities FOR INSERT TO authenticated WITH CHECK (true);
