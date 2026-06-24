-- 1. Profiles Table
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    tagline TEXT,
    now TEXT,
    current_focus_description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. Personas Table
CREATE TABLE IF NOT EXISTS personas (
    id TEXT PRIMARY KEY, 
    name TEXT NOT NULL,
    description TEXT,
    status TEXT CHECK (status IN ('active', 'exploring', 'paused')),
    visibility TEXT CHECK (visibility IN ('public', 'private')) DEFAULT 'public',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. Persona Evolutions
CREATE TABLE IF NOT EXISTS persona_evolutions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    persona_id TEXT REFERENCES personas(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 4. Projects Table
CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT CHECK (status IN ('exploring', 'building', 'shipped', 'paused')),
    current_focus TEXT,
    github_link TEXT,
    demo_link TEXT,
    notes_link TEXT,
    visibility TEXT CHECK (visibility IN ('public', 'private')) DEFAULT 'public',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 5. Project-Personas Join Table
CREATE TABLE IF NOT EXISTS project_personas (
    project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
    persona_id TEXT REFERENCES personas(id) ON DELETE CASCADE,
    PRIMARY KEY (project_id, persona_id)
);

-- 6. Focus Timeline Phases
CREATE TABLE IF NOT EXISTS focus_timeline_phases (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    time_range TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 7. Phase-Personas Join Table
CREATE TABLE IF NOT EXISTS phase_personas (
    phase_id TEXT REFERENCES focus_timeline_phases(id) ON DELETE CASCADE,
    persona_id TEXT REFERENCES personas(id) ON DELETE CASCADE,
    PRIMARY KEY (phase_id, persona_id)
);

-- 8. Phase-Projects Join Table
CREATE TABLE IF NOT EXISTS phase_projects (
    phase_id TEXT REFERENCES focus_timeline_phases(id) ON DELETE CASCADE,
    project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
    PRIMARY KEY (phase_id, project_id)
);

-- 9. Activities Table
CREATE TABLE IF NOT EXISTS activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content TEXT NOT NULL,
    visibility TEXT CHECK (visibility IN ('public', 'private', 'draft')) DEFAULT 'public',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 10. Activity Relationships
CREATE TABLE IF NOT EXISTS activity_personas (
    activity_id UUID REFERENCES activities(id) ON DELETE CASCADE,
    persona_id TEXT REFERENCES personas(id) ON DELETE CASCADE,
    PRIMARY KEY (activity_id, persona_id)
);

CREATE TABLE IF NOT EXISTS activity_projects (
    activity_id UUID REFERENCES activities(id) ON DELETE CASCADE,
    project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
    PRIMARY KEY (activity_id, project_id)
);

-- 11. Learning Logs
CREATE TABLE IF NOT EXISTS learning_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content TEXT NOT NULL,
    visibility TEXT CHECK (visibility IN ('public', 'private', 'draft')) DEFAULT 'public',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 12. Learning Log Relationships
CREATE TABLE IF NOT EXISTS learning_log_personas (
    log_id UUID REFERENCES learning_logs(id) ON DELETE CASCADE,
    persona_id TEXT REFERENCES personas(id) ON DELETE CASCADE,
    PRIMARY KEY (log_id, persona_id)
);

CREATE TABLE IF NOT EXISTS learning_log_projects (
    log_id UUID REFERENCES learning_logs(id) ON DELETE CASCADE,
    project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
    PRIMARY KEY (log_id, project_id)
);

-- ==========================================
-- DATA SEEDING
-- ==========================================

-- Insert Profile
INSERT INTO profiles (name, tagline, now, current_focus_description)
VALUES ('Anugrah Zeputra', 'Humanizing technology to make life more easier.', 'Engineering Prompt to sell on Promptbase.com while building web apps at work', 'Engineering Prompt to Sell on Promptbase.com');

-- Insert Personas
INSERT INTO personas (id, name, description, status, visibility, created_at) VALUES
('fullstack-developer', 'Fullstack Developer', 'building E2E Web Apps, specialized in Backend Apps with Spring Boot and Frontend with Angular.', 'active', 'public', '2022-01-17'),
('prompt-engineer', 'Prompt Engineer', 'Design AI Prompt, specialized in Text-to-Image and Text-to-Text Prompt Engineering.', 'exploring', 'public', '2025-12-25'),
('devops-engineer', 'Dev-Ops Engineer', 'Handling Apps-to-Market Deployment, specialized in CI/CD with GitHub Actions and Infrastructure with Terraform.', 'exploring', 'public', '2021-03-05'),
('indie-mobile-developer', 'Indie Mobile Developer', 'Making portfolio mobile apps, specialized in Android with Kotlin and iOS with Swift.', 'exploring', 'public', '2021-12-25');

-- Insert Projects
INSERT INTO projects (id, title, description, status, current_focus, visibility) VALUES
('askred-mitra-apps', 'Askred Mitra Apps', 'It is used for seamless application integration between Askrindo and BRI, covering insurance pre-sale, post-sale, and distribution for manufacturing companies', 'shipped', 'Maintaining and optimizing the app', 'private'),
('akk-apps', 'A.K.K Apps', 'It is used to simplify the claims process for Askrindo Mitra and to provide more transparent and seamless claims analytics from Askrindo.', 'building', 'Enhancing and Implementing new features', 'private'),
('promptbase-prompt-seller', 'Promptbase Prompt Seller', 'Sell-ready prompt, fully optimized and ready to use on Promptbase.com.', 'exploring', 'Enhancing and Implementing new features', 'public'),
('portfolio-project', 'Portfolio Project', 'My personal portfolio website to showcase my projects, skills, and experiences.', 'shipped', 'Adding new features and updating content', 'public');

-- Insert Project-Persona Relationships
INSERT INTO project_personas (project_id, persona_id) VALUES
('askred-mitra-apps', 'fullstack-developer'),
('askred-mitra-apps', 'devops-engineer'),
('akk-apps', 'fullstack-developer'),
('akk-apps', 'devops-engineer'),
('promptbase-prompt-seller', 'prompt-engineer'),
('portfolio-project', 'fullstack-developer'),
('portfolio-project', 'devops-engineer'),
('portfolio-project', 'indie-mobile-developer');

-- Insert Focus Timeline Phases
INSERT INTO focus_timeline_phases (id, title, time_range, description) VALUES
('phase-1', 'Dev-Ops Mastery', '2021-05 to 2021-12', 'Mastering Dev-Ops skills including CI/CD and Infrastructure as Code.'),
('phase-2', 'Building Apps for PT Asuransi Kredit Indonesia', '2022-01 to now', 'Developing and maintaining web applications for Askrindo and Askrindo-BRI integration.'),
('phase-3', 'Selling Prompts on Promptbase.com', '2025-12 to now', 'Designing and selling AI prompts optimized for various use-cases on Promptbase.com.');

-- Insert Phase-Persona Relationships
INSERT INTO phase_personas (phase_id, persona_id) VALUES
('phase-1', 'devops-engineer'),
('phase-2', 'fullstack-developer'),
('phase-2', 'devops-engineer'),
('phase-3', 'prompt-engineer');

-- Insert Phase-Project Relationships
INSERT INTO phase_projects (phase_id, project_id) VALUES
('phase-2', 'askred-mitra-apps'),
('phase-2', 'akk-apps'),
('phase-3', 'promptbase-prompt-seller');

-- ==========================================
-- ROW LEVEL SECURITY (RLS)
-- ==========================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE personas ENABLE ROW LEVEL SECURITY;
ALTER TABLE persona_evolutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_personas ENABLE ROW LEVEL SECURITY;
ALTER TABLE focus_timeline_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE phase_personas ENABLE ROW LEVEL SECURITY;
ALTER TABLE phase_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_personas ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_log_personas ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_log_projects ENABLE ROW LEVEL SECURITY;

-- Create Policies for Authenticated Admin Access (View everything)
DO $$ 
BEGIN
    -- Profiles
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Admins can view all profiles') THEN
        CREATE POLICY "Admins can view all profiles" ON profiles FOR SELECT TO authenticated USING (true);
    END IF;
    -- Personas
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Admins can view all personas') THEN
        CREATE POLICY "Admins can view all personas" ON personas FOR SELECT TO authenticated USING (true);
    END IF;
    -- Projects
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Admins can view all projects') THEN
        CREATE POLICY "Admins can view all projects" ON projects FOR SELECT TO authenticated USING (true);
    END IF;
    -- Activities
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Admins can view all activities') THEN
        CREATE POLICY "Admins can view all activities" ON activities FOR SELECT TO authenticated USING (true);
    END IF;
    -- Project Personas
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Admins can view all project_personas') THEN
        CREATE POLICY "Admins can view all project_personas" ON project_personas FOR SELECT TO authenticated USING (true);
    END IF;

    -- ALLOW INSERT/UPDATE for authenticated users (Admin CRUD)
    -- Simplified for Personal OS: Authenticated = Admin
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Admins can insert activities') THEN
        CREATE POLICY "Admins can insert activities" ON activities FOR INSERT TO authenticated WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Admins can insert relations_p') THEN
        CREATE POLICY "Admins can insert relations_p" ON activity_personas FOR INSERT TO authenticated WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Admins can insert relations_proj') THEN
        CREATE POLICY "Admins can insert relations_proj" ON activity_projects FOR INSERT TO authenticated WITH CHECK (true);
    END IF;
END $$;
