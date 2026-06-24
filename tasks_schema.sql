-- ========================================================
-- SCRIPT MIGRASI DATABASE PERSONA OS: HIERARCHICAL TASKS
-- ========================================================

-- 1. Buat Tabel Tasks (Folder/Subfolder structure)
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    status TEXT CHECK (status IN ('todo', 'in_progress', 'done')) DEFAULT 'todo',
    project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. Aktifkan Row Level Security (RLS)
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- 3. Buat Policies untuk Hak Akses
DO $$
BEGIN
    -- Select Policy (Public can read)
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Anyone can view tasks') THEN
        CREATE POLICY "Anyone can view tasks" ON tasks FOR SELECT USING (true);
    END IF;

    -- Insert Policy (Only Authenticated/Admin can insert)
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Admins can insert tasks') THEN
        CREATE POLICY "Admins can insert tasks" ON tasks FOR INSERT TO authenticated WITH CHECK (true);
    END IF;

    -- Update Policy (Only Authenticated/Admin can update)
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Admins can update tasks') THEN
        CREATE POLICY "Admins can update tasks" ON tasks FOR UPDATE TO authenticated USING (true);
    END IF;

    -- Delete Policy (Only Authenticated/Admin can delete)
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Admins can delete tasks') THEN
        CREATE POLICY "Admins can delete tasks" ON tasks FOR DELETE TO authenticated USING (true);
    END IF;
END $$;
