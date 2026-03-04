-- =====================================================
-- MULTI-TENANT RLS & STORAGE POLICIES
-- Description: Row Level Security policies for multi-tenant
--              data isolation + storage bucket policies
-- Run AFTER: 006_multi_tenant.sql
-- =====================================================

-- NOTE: Our API uses supabase service_role key (supabaseAdmin),
-- which BYPASSES RLS. These policies are a defense-in-depth
-- measure — they protect against direct anon/authenticated access
-- and act as a safety net if any route accidentally uses the
-- anon client.

-- =====================================================
-- 1. RLS ON ROOT TABLES (school_id column)
-- =====================================================

-- --- USERS ---
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS users_school_isolation ON users;
CREATE POLICY users_school_isolation ON users
    FOR ALL
    USING (
        school_id = (SELECT school_id FROM users WHERE id = auth.uid())
        OR (SELECT role FROM users WHERE id = auth.uid()) = 'SUPER_ADMIN'
    );

-- --- STUDENTS ---
ALTER TABLE students ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS students_school_isolation ON students;
CREATE POLICY students_school_isolation ON students
    FOR ALL
    USING (
        school_id = (SELECT school_id FROM users WHERE id = auth.uid())
        OR (SELECT role FROM users WHERE id = auth.uid()) = 'SUPER_ADMIN'
    );

-- --- TEACHERS ---
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS teachers_school_isolation ON teachers;
CREATE POLICY teachers_school_isolation ON teachers
    FOR ALL
    USING (
        school_id = (SELECT school_id FROM users WHERE id = auth.uid())
        OR (SELECT role FROM users WHERE id = auth.uid()) = 'SUPER_ADMIN'
    );

-- --- ACADEMIC YEARS ---
ALTER TABLE academic_years ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS academic_years_school_isolation ON academic_years;
CREATE POLICY academic_years_school_isolation ON academic_years
    FOR ALL
    USING (
        school_id = (SELECT school_id FROM users WHERE id = auth.uid())
        OR (SELECT role FROM users WHERE id = auth.uid()) = 'SUPER_ADMIN'
    );

-- --- SUBJECTS ---
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS subjects_school_isolation ON subjects;
CREATE POLICY subjects_school_isolation ON subjects
    FOR ALL
    USING (
        school_id = (SELECT school_id FROM users WHERE id = auth.uid())
        OR (SELECT role FROM users WHERE id = auth.uid()) = 'SUPER_ADMIN'
    );

-- --- ANNOUNCEMENTS ---
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS announcements_school_isolation ON announcements;
CREATE POLICY announcements_school_isolation ON announcements
    FOR ALL
    USING (
        school_id = (SELECT school_id FROM users WHERE id = auth.uid())
        OR (SELECT role FROM users WHERE id = auth.uid()) = 'SUPER_ADMIN'
    );

-- --- QUESTION PASSAGES ---
ALTER TABLE question_passages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS question_passages_school_isolation ON question_passages;
CREATE POLICY question_passages_school_isolation ON question_passages
    FOR ALL
    USING (
        school_id = (SELECT school_id FROM users WHERE id = auth.uid())
        OR (SELECT role FROM users WHERE id = auth.uid()) = 'SUPER_ADMIN'
    );

-- =====================================================
-- 2. RLS ON CHAIN TABLES (no school_id, use FK chain)
-- =====================================================

-- --- CLASSES (chain: classes → academic_years.school_id) ---
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS classes_school_isolation ON classes;
CREATE POLICY classes_school_isolation ON classes
    FOR ALL
    USING (
        academic_year_id IN (
            SELECT id FROM academic_years
            WHERE school_id = (SELECT school_id FROM users WHERE id = auth.uid())
        )
        OR (SELECT role FROM users WHERE id = auth.uid()) = 'SUPER_ADMIN'
    );

-- --- TEACHING ASSIGNMENTS (chain: TA → academic_years.school_id) ---
ALTER TABLE teaching_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS teaching_assignments_school_isolation ON teaching_assignments;
CREATE POLICY teaching_assignments_school_isolation ON teaching_assignments
    FOR ALL
    USING (
        academic_year_id IN (
            SELECT id FROM academic_years
            WHERE school_id = (SELECT school_id FROM users WHERE id = auth.uid())
        )
        OR (SELECT role FROM users WHERE id = auth.uid()) = 'SUPER_ADMIN'
    );

-- --- QUIZZES (chain: quiz → TA → academic_years) ---
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS quizzes_school_isolation ON quizzes;
CREATE POLICY quizzes_school_isolation ON quizzes
    FOR ALL
    USING (
        teaching_assignment_id IN (
            SELECT ta.id FROM teaching_assignments ta
            JOIN academic_years ay ON ta.academic_year_id = ay.id
            WHERE ay.school_id = (SELECT school_id FROM users WHERE id = auth.uid())
        )
        OR (SELECT role FROM users WHERE id = auth.uid()) = 'SUPER_ADMIN'
    );

-- --- EXAMS (chain: exam → TA → academic_years) ---
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS exams_school_isolation ON exams;
CREATE POLICY exams_school_isolation ON exams
    FOR ALL
    USING (
        teaching_assignment_id IN (
            SELECT ta.id FROM teaching_assignments ta
            JOIN academic_years ay ON ta.academic_year_id = ay.id
            WHERE ay.school_id = (SELECT school_id FROM users WHERE id = auth.uid())
        )
        OR (SELECT role FROM users WHERE id = auth.uid()) = 'SUPER_ADMIN'
    );

-- --- MATERIALS (chain: material → TA → academic_years) ---
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS materials_school_isolation ON materials;
CREATE POLICY materials_school_isolation ON materials
    FOR ALL
    USING (
        teaching_assignment_id IN (
            SELECT ta.id FROM teaching_assignments ta
            JOIN academic_years ay ON ta.academic_year_id = ay.id
            WHERE ay.school_id = (SELECT school_id FROM users WHERE id = auth.uid())
        )
        OR (SELECT role FROM users WHERE id = auth.uid()) = 'SUPER_ADMIN'
    );

-- --- ASSIGNMENTS (chain: assignment → TA → academic_years) ---
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS assignments_school_isolation ON assignments;
CREATE POLICY assignments_school_isolation ON assignments
    FOR ALL
    USING (
        teaching_assignment_id IN (
            SELECT ta.id FROM teaching_assignments ta
            JOIN academic_years ay ON ta.academic_year_id = ay.id
            WHERE ay.school_id = (SELECT school_id FROM users WHERE id = auth.uid())
        )
        OR (SELECT role FROM users WHERE id = auth.uid()) = 'SUPER_ADMIN'
    );

-- --- NOTIFICATIONS (scoped by user_id) ---
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS notifications_user_isolation ON notifications;
CREATE POLICY notifications_user_isolation ON notifications
    FOR ALL
    USING (
        user_id = auth.uid()
        OR (SELECT role FROM users WHERE id = auth.uid()) = 'SUPER_ADMIN'
    );

-- --- SESSIONS (scoped by user_id) ---
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sessions_user_isolation ON sessions;
CREATE POLICY sessions_user_isolation ON sessions
    FOR ALL
    USING (
        user_id = auth.uid()
        OR (SELECT role FROM users WHERE id = auth.uid()) = 'SUPER_ADMIN'
    );

-- --- SCHOOLS (public read for login, admin write) ---
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS schools_public_read ON schools;
CREATE POLICY schools_public_read ON schools
    FOR SELECT
    USING (is_active = true);

DROP POLICY IF EXISTS schools_super_admin_all ON schools;
CREATE POLICY schools_super_admin_all ON schools
    FOR ALL
    USING ((SELECT role FROM users WHERE id = auth.uid()) = 'SUPER_ADMIN');

-- =====================================================
-- 3. STORAGE BUCKET POLICIES
-- =====================================================

-- Materials bucket: per-school folder isolation
-- Path format: {school_id}/{timestamp}-{uniqueId}.{ext}
DROP POLICY IF EXISTS materials_school_isolation ON storage.objects;
CREATE POLICY materials_school_isolation ON storage.objects
    FOR ALL
    USING (
        bucket_id = 'materials'
        AND (
            -- User can access their school's folder
            (storage.foldername(name))[1] = (SELECT school_id::text FROM users WHERE id = auth.uid())
            OR (SELECT role FROM users WHERE id = auth.uid()) = 'SUPER_ADMIN'
        )
    );

-- Uploads bucket (question images): per-school folder isolation
-- Path format: question-images/{school_id}/{timestamp}-{random}.{ext}
DROP POLICY IF EXISTS uploads_school_isolation ON storage.objects;
CREATE POLICY uploads_school_isolation ON storage.objects
    FOR ALL
    USING (
        bucket_id = 'uploads'
        AND (
            (storage.foldername(name))[2] = (SELECT school_id::text FROM users WHERE id = auth.uid())
            OR (SELECT role FROM users WHERE id = auth.uid()) = 'SUPER_ADMIN'
        )
    );

-- =====================================================
-- VERIFICATION
-- =====================================================
-- Check RLS is enabled:
-- SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
