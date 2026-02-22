-- ═══════════════════════════════════════════════════════════════
--  RLS POLICIES FOR OFFLINE SERVER (Anon Key Access)
-- ═══════════════════════════════════════════════════════════════
--
--  Run this SQL in Supabase SQL Editor (Dashboard → SQL Editor)
--  These policies allow the 'anon' role to read teacher-scoped
--  data and insert exam results (quiz/assignment submissions).
--
--  IMPORTANT: Run this BEFORE using the offline server.
-- ═══════════════════════════════════════════════════════════════

-- ── Enable RLS on all relevant tables ──
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE teaching_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_submissions ENABLE ROW LEVEL SECURITY;

-- ═══════════════════════════════════════════════════
--  SELECT POLICIES (for data download)
-- ═══════════════════════════════════════════════════

-- Teachers: allow lookup by NIP
CREATE POLICY "anon_read_teachers" ON teachers
    FOR SELECT TO anon
    USING (true);

-- Users: allow reading full_name for teacher/student display
CREATE POLICY "anon_read_users" ON users
    FOR SELECT TO anon
    USING (true);

-- Teaching assignments: allow reading all (filtered by teacher_id in app)
CREATE POLICY "anon_read_teaching_assignments" ON teaching_assignments
    FOR SELECT TO anon
    USING (true);

-- Subjects: allow reading subject names
CREATE POLICY "anon_read_subjects" ON subjects
    FOR SELECT TO anon
    USING (true);

-- Classes: allow reading class info
CREATE POLICY "anon_read_classes" ON classes
    FOR SELECT TO anon
    USING (true);

-- Students: allow reading student data
CREATE POLICY "anon_read_students" ON students
    FOR SELECT TO anon
    USING (true);

-- Quizzes: allow reading active quizzes
CREATE POLICY "anon_read_quizzes" ON quizzes
    FOR SELECT TO anon
    USING (true);

-- Quiz questions: allow reading questions
CREATE POLICY "anon_read_quiz_questions" ON quiz_questions
    FOR SELECT TO anon
    USING (true);

-- Assignments: allow reading assignments
CREATE POLICY "anon_read_assignments" ON assignments
    FOR SELECT TO anon
    USING (true);

-- ═══════════════════════════════════════════════════
--  INSERT/UPSERT POLICIES (for result upload)
-- ═══════════════════════════════════════════════════

-- Quiz submissions: allow inserting/upserting results
CREATE POLICY "anon_insert_quiz_submissions" ON quiz_submissions
    FOR INSERT TO anon
    WITH CHECK (true);

CREATE POLICY "anon_update_quiz_submissions" ON quiz_submissions
    FOR UPDATE TO anon
    USING (true);

-- Student submissions (assignments): allow inserting/upserting results
CREATE POLICY "anon_insert_student_submissions" ON student_submissions
    FOR INSERT TO anon
    WITH CHECK (true);

CREATE POLICY "anon_update_student_submissions" ON student_submissions
    FOR UPDATE TO anon
    USING (true);

-- Quiz submissions: allow reading (for conflict detection)
CREATE POLICY "anon_read_quiz_submissions" ON quiz_submissions
    FOR SELECT TO anon
    USING (true);

-- Student submissions: allow reading (for conflict detection)
CREATE POLICY "anon_read_student_submissions" ON student_submissions
    FOR SELECT TO anon
    USING (true);
