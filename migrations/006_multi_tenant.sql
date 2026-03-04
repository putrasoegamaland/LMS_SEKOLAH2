-- =====================================================
-- MULTI-TENANT MIGRATION
-- Description: Add schools table, school_id to root tables,
--              rebuild unique constraints for multi-tenancy
-- =====================================================

-- 1. CREATE schools table
CREATE TABLE IF NOT EXISTS schools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    logo_url TEXT,
    address TEXT,
    phone VARCHAR(50),
    email VARCHAR(255),
    school_level VARCHAR(20) CHECK (school_level IN ('SMP', 'SMA', 'BOTH')),
    is_active BOOLEAN DEFAULT true,
    settings JSONB DEFAULT '{}',
    max_students INTEGER DEFAULT 500,
    max_teachers INTEGER DEFAULT 50,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_schools_code ON schools(code);
CREATE INDEX IF NOT EXISTS idx_schools_active ON schools(is_active);

-- 2. ADD school_id to root tables
ALTER TABLE users ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES schools(id);
ALTER TABLE academic_years ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES schools(id);
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES schools(id);
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES schools(id);
ALTER TABLE question_passages ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES schools(id);

-- 3. CREATE indexes for school_id
CREATE INDEX IF NOT EXISTS idx_users_school ON users(school_id);
CREATE INDEX IF NOT EXISTS idx_academic_years_school ON academic_years(school_id);
CREATE INDEX IF NOT EXISTS idx_subjects_school ON subjects(school_id);
CREATE INDEX IF NOT EXISTS idx_announcements_school ON announcements(school_id);
CREATE INDEX IF NOT EXISTS idx_question_passages_school ON question_passages(school_id);

-- 4. UPDATE role constraint to include SUPER_ADMIN
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
    CHECK (role IN ('SUPER_ADMIN', 'ADMIN', 'GURU', 'SISWA', 'WALI'));

-- 5. REBUILD unique constraints for multi-tenancy
-- Username: allow same username across different schools
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_username_key;
ALTER TABLE users ADD CONSTRAINT users_username_school_unique UNIQUE(username, school_id);

-- NIS: allow same NIS across different schools
-- students.nis → need school context via users table
-- We add school_id to students for direct constraint enforcement
ALTER TABLE students ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES schools(id);
CREATE INDEX IF NOT EXISTS idx_students_school ON students(school_id);
ALTER TABLE students DROP CONSTRAINT IF EXISTS students_nis_key;
-- Will add unique constraint after backfill (see step 8)

-- NIP: allow same NIP across different schools
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES schools(id);
CREATE INDEX IF NOT EXISTS idx_teachers_school ON teachers(school_id);
ALTER TABLE teachers DROP CONSTRAINT IF EXISTS teachers_nip_key;
-- Will add unique constraint after backfill (see step 8)

-- 6. DISABLE RLS on schools (API uses service_role)
ALTER TABLE schools DISABLE ROW LEVEL SECURITY;

-- =====================================================
-- 7. DATA MIGRATION — Run this AFTER the schema changes
-- Creates a default school and backfills all existing data
-- =====================================================

DO $$
DECLARE
    default_school_id UUID;
BEGIN
    -- Create default school
    INSERT INTO schools (name, code, school_level)
    VALUES ('Sekolah Default', 'default', 'BOTH')
    ON CONFLICT (code) DO NOTHING
    RETURNING id INTO default_school_id;

    -- If already exists, fetch it
    IF default_school_id IS NULL THEN
        SELECT id INTO default_school_id FROM schools WHERE code = 'default';
    END IF;

    -- Backfill school_id for all root tables
    UPDATE users SET school_id = default_school_id WHERE school_id IS NULL;
    UPDATE academic_years SET school_id = default_school_id WHERE school_id IS NULL;
    UPDATE subjects SET school_id = default_school_id WHERE school_id IS NULL;
    UPDATE announcements SET school_id = default_school_id WHERE school_id IS NULL;
    UPDATE question_passages SET school_id = default_school_id WHERE school_id IS NULL;

    -- Backfill students and teachers school_id from their user records
    UPDATE students SET school_id = default_school_id WHERE school_id IS NULL;
    UPDATE teachers SET school_id = default_school_id WHERE school_id IS NULL;

    RAISE NOTICE 'Default school ID: %', default_school_id;
END $$;

-- 8. SET NOT NULL constraints (after backfill)
ALTER TABLE users ALTER COLUMN school_id SET NOT NULL;
ALTER TABLE academic_years ALTER COLUMN school_id SET NOT NULL;
ALTER TABLE subjects ALTER COLUMN school_id SET NOT NULL;
ALTER TABLE students ALTER COLUMN school_id SET NOT NULL;
ALTER TABLE teachers ALTER COLUMN school_id SET NOT NULL;

-- 9. ADD composite unique constraints (after backfill + NOT NULL)
ALTER TABLE students ADD CONSTRAINT students_nis_school_unique UNIQUE(nis, school_id);
ALTER TABLE teachers ADD CONSTRAINT teachers_nip_school_unique UNIQUE(nip, school_id);

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================
-- SELECT * FROM schools;
-- SELECT COUNT(*) FROM users WHERE school_id IS NOT NULL;
-- SELECT COUNT(*) FROM academic_years WHERE school_id IS NOT NULL;
-- SELECT COUNT(*) FROM subjects WHERE school_id IS NOT NULL;
-- SELECT COUNT(*) FROM students WHERE school_id IS NOT NULL;
-- SELECT COUNT(*) FROM teachers WHERE school_id IS NOT NULL;
