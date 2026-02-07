-- ============================================
-- SEED DATA FOR STUDENT LIFECYCLE TESTING
-- ============================================
-- This script will:
-- 1. Clear existing data
-- 2. Create dummy data for 2 academic years
-- 3. Populate classes for SMP & SMA
-- 4. Create students distributed across classes
-- 5. Create teachers and subjects
-- ============================================

-- STEP 1: CLEAR EXISTING DATA
-- ============================================

-- Delete in reverse dependency order (only tables that exist)
DELETE FROM student_enrollments;
DELETE FROM teaching_assignments;
DELETE FROM students;
DELETE FROM teachers;
DELETE FROM classes;
DELETE FROM subjects;
DELETE FROM academic_years;
DELETE FROM users WHERE role IN ('SISWA', 'GURU');

-- STEP 2: CREATE ACADEMIC YEARS
-- ============================================

INSERT INTO academic_years (id, name, is_active, created_at) VALUES
('11111111-1111-1111-1111-111111111111', '2024/2025', false, NOW()),
('22222222-2222-2222-2222-222222222222', '2025/2026', true, NOW());

-- STEP 3: CREATE SUBJECTS
-- ============================================

INSERT INTO subjects (id, name, created_at) VALUES
('33333333-3333-3333-3333-333333333331', 'Matematika', NOW()),
('33333333-3333-3333-3333-333333333332', 'Bahasa Indonesia', NOW()),
('33333333-3333-3333-3333-333333333333', 'Bahasa Inggris', NOW()),
('33333333-3333-3333-3333-333333333334', 'IPA', NOW()),
('33333333-3333-3333-3333-333333333335', 'IPS', NOW());

-- STEP 4: CREATE CLASSES FOR 2024/2025 (SMP & SMA)
-- ============================================

-- SMP Classes 2024/2025
INSERT INTO classes (id, name, grade_level, school_level, academic_year_id, created_at) VALUES
-- MP1 (Grade 7)
('44444444-4444-4444-4444-444444444411', 'MP1-A', 1, 'SMP', '11111111-1111-1111-1111-111111111111', NOW()),
('44444444-4444-4444-4444-444444444412', 'MP1-B', 1, 'SMP', '11111111-1111-1111-1111-111111111111', NOW()),
-- MP2 (Grade 8)
('44444444-4444-4444-4444-444444444421', 'MP2-A', 2, 'SMP', '11111111-1111-1111-1111-111111111111', NOW()),
('44444444-4444-4444-4444-444444444422', 'MP2-B', 2, 'SMP', '11111111-1111-1111-1111-111111111111', NOW()),
-- MP3 (Grade 9)
('44444444-4444-4444-4444-444444444431', 'MP3-A', 3, 'SMP', '11111111-1111-1111-1111-111111111111', NOW()),
('44444444-4444-4444-4444-444444444432', 'MP3-B', 3, 'SMP', '11111111-1111-1111-1111-111111111111', NOW());

-- SMA Classes 2024/2025
INSERT INTO classes (id, name, grade_level, school_level, academic_year_id, created_at) VALUES
-- MA1 (Grade 10)
('44444444-4444-4444-4444-444444444451', 'MA1-A', 1, 'SMA', '11111111-1111-1111-1111-111111111111', NOW()),
('44444444-4444-4444-4444-444444444452', 'MA1-B', 1, 'SMA', '11111111-1111-1111-1111-111111111111', NOW()),
-- MA2 (Grade 11)
('44444444-4444-4444-4444-444444444461', 'MA2-A', 2, 'SMA', '11111111-1111-1111-1111-111111111111', NOW()),
('44444444-4444-4444-4444-444444444462', 'MA2-B', 2, 'SMA', '11111111-1111-1111-1111-111111111111', NOW()),
-- MA3 (Grade 12)
('44444444-4444-4444-4444-444444444471', 'MA3-A', 3, 'SMA', '11111111-1111-1111-1111-111111111111', NOW()),
('44444444-4444-4444-4444-444444444472', 'MA3-B', 3, 'SMA', '11111111-1111-1111-1111-111111111111', NOW());

-- STEP 5: CREATE CLASSES FOR 2025/2026 (Target Promotion)
-- ============================================

-- SMP Classes 2025/2026
INSERT INTO classes (id, name, grade_level, school_level, academic_year_id, created_at) VALUES
-- MP1 (Grade 7)
('55555555-5555-5555-5555-555555555511', 'MP1-A', 1, 'SMP', '22222222-2222-2222-2222-222222222222', NOW()),
('55555555-5555-5555-5555-555555555512', 'MP1-B', 1, 'SMP', '22222222-2222-2222-2222-222222222222', NOW()),
-- MP2 (Grade 8) - TARGET for MP1 students
('55555555-5555-5555-5555-555555555521', 'MP2-A', 2, 'SMP', '22222222-2222-2222-2222-222222222222', NOW()),
('55555555-5555-5555-5555-555555555522', 'MP2-B', 2, 'SMP', '22222222-2222-2222-2222-222222222222', NOW()),
-- MP3 (Grade 9) - TARGET for MP2 students
('55555555-5555-5555-5555-555555555531', 'MP3-A', 3, 'SMP', '22222222-2222-2222-2222-222222222222', NOW()),
('55555555-5555-5555-5555-555555555532', 'MP3-B', 3, 'SMP', '22222222-2222-2222-2222-222222222222', NOW());

-- SMA Classes 2025/2026
INSERT INTO classes (id, name, grade_level, school_level, academic_year_id, created_at) VALUES
-- MA1 (Grade 10) - TARGET for MP3 students (SMP to SMA transition)
('55555555-5555-5555-5555-555555555551', 'MA1-A', 1, 'SMA', '22222222-2222-2222-2222-222222222222', NOW()),
('55555555-5555-5555-5555-555555555552', 'MA1-B', 1, 'SMA', '22222222-2222-2222-2222-222222222222', NOW()),
-- MA2 (Grade 11) - TARGET for MA1 students
('55555555-5555-5555-5555-555555555561', 'MA2-A', 2, 'SMA', '22222222-2222-2222-2222-222222222222', NOW()),
('55555555-5555-5555-5555-555555555562', 'MA2-B', 2, 'SMA', '22222222-2222-2222-2222-222222222222', NOW()),
-- MA3 (Grade 12) - TARGET for MA2 students
('55555555-5555-5555-5555-555555555571', 'MA3-A', 3, 'SMA', '22222222-2222-2222-2222-222222222222', NOW()),
('55555555-5555-5555-5555-555555555572', 'MA3-B', 3, 'SMA', '22222222-2222-2222-2222-222222222222', NOW());

-- STEP 6: CREATE USERS & STUDENTS FOR MP1 (2024/2025)
-- ============================================

-- MP1-A: 25 students
DO $$
BEGIN
  FOR i IN 1..25 LOOP
    INSERT INTO users (id, username, password_hash, full_name, role, created_at) VALUES
    (gen_random_uuid(), 'mp1a_siswa' || i, '$2a$10$dummy_hash', 'Siswa MP1-A ' || i, 'SISWA', NOW());
    
    INSERT INTO students (id, user_id, nis, class_id, status, created_at) VALUES
    (gen_random_uuid(), (SELECT id FROM users WHERE username = 'mp1a_siswa' || i), 'MP1A' || LPAD(i::text, 3, '0'), '44444444-4444-4444-4444-444444444411', 'ACTIVE', NOW());
  END LOOP;
END $$;

-- MP1-B: 25 students
DO $$
BEGIN
  FOR i IN 1..25 LOOP
    INSERT INTO users (id, username, password_hash, full_name, role, created_at) VALUES
    (gen_random_uuid(), 'mp1b_siswa' || i, '$2a$10$dummy_hash', 'Siswa MP1-B ' || i, 'SISWA', NOW());
    
    INSERT INTO students (id, user_id, nis, class_id, status, created_at) VALUES
    (gen_random_uuid(), (SELECT id FROM users WHERE username = 'mp1b_siswa' || i), 'MP1B' || LPAD(i::text, 3, '0'), '44444444-4444-4444-4444-444444444412', 'ACTIVE', NOW());
  END LOOP;
END $$;

-- STEP 7: CREATE STUDENTS FOR MP2 (2024/2025)
-- ============================================

-- MP2-A: 25 students
DO $$
BEGIN
  FOR i IN 1..25 LOOP
    INSERT INTO users (id, username, password_hash, full_name, role, created_at) VALUES
    (gen_random_uuid(), 'mp2a_siswa' || i, '$2a$10$dummy_hash', 'Siswa MP2-A ' || i, 'SISWA', NOW());
    
    INSERT INTO students (id, user_id, nis, class_id, status, created_at) VALUES
    (gen_random_uuid(), (SELECT id FROM users WHERE username = 'mp2a_siswa' || i), 'MP2A' || LPAD(i::text, 3, '0'), '44444444-4444-4444-4444-444444444421', 'ACTIVE', NOW());
  END LOOP;
END $$;

-- MP2-B: 25 students
DO $$
BEGIN
  FOR i IN 1..25 LOOP
    INSERT INTO users (id, username, password_hash, full_name, role, created_at) VALUES
    (gen_random_uuid(), 'mp2b_siswa' || i, '$2a$10$dummy_hash', 'Siswa MP2-B ' || i, 'SISWA', NOW());
    
    INSERT INTO students (id, user_id, nis, class_id, status, created_at) VALUES
    (gen_random_uuid(), (SELECT id FROM users WHERE username = 'mp2b_siswa' || i), 'MP2B' || LPAD(i::text, 3, '0'), '44444444-4444-4444-4444-444444444422', 'ACTIVE', NOW());
  END LOOP;
END $$;

-- STEP 8: CREATE STUDENTS FOR MA1 (2024/2025)
-- ============================================

-- MA1-A: 25 students
DO $$
BEGIN
  FOR i IN 1..25 LOOP
    INSERT INTO users (id, username, password_hash, full_name, role, created_at) VALUES
    (gen_random_uuid(), 'ma1a_siswa' || i, '$2a$10$dummy_hash', 'Siswa MA1-A ' || i, 'SISWA', NOW());
    
    INSERT INTO students (id, user_id, nis, class_id, status, created_at) VALUES
    (gen_random_uuid(), (SELECT id FROM users WHERE username = 'ma1a_siswa' || i), 'MA1A' || LPAD(i::text, 3, '0'), '44444444-4444-4444-4444-444444444451', 'ACTIVE', NOW());
  END LOOP;
END $$;

-- MA1-B: 25 students
DO $$
BEGIN
  FOR i IN 1..25 LOOP
    INSERT INTO users (id, username, password_hash, full_name, role, created_at) VALUES
    (gen_random_uuid(), 'ma1b_siswa' || i, '$2a$10$dummy_hash', 'Siswa MA1-B ' || i, 'SISWA', NOW());
    
    INSERT INTO students (id, user_id, nis, class_id, status, created_at) VALUES
    (gen_random_uuid(), (SELECT id FROM users WHERE username = 'ma1b_siswa' || i), 'MA1B' || LPAD(i::text, 3, '0'), '44444444-4444-4444-4444-444444444452', 'ACTIVE', NOW());
  END LOOP;
END $$;

-- STEP 9: CREATE INITIAL ENROLLMENTS FOR ALL STUDENTS
-- ============================================
-- Auto-create enrollment records for existing students

INSERT INTO student_enrollments (student_id, class_id, academic_year_id, status, notes, created_at)
SELECT 
  s.id AS student_id,
  s.class_id,
  c.academic_year_id,
  'ACTIVE' AS status,
  'Initial enrollment - seeded data' AS notes,
  NOW() AS created_at
FROM students s
JOIN classes c ON s.class_id = c.id
WHERE s.class_id IS NOT NULL;

-- STEP 10: CREATE DUMMY TEACHERS
-- ============================================

DO $$
BEGIN
  FOR i IN 1..10 LOOP
    INSERT INTO users (id, username, password_hash, full_name, role, created_at) VALUES
    (gen_random_uuid(), 'guru' || i, '$2a$10$dummy_hash', 'Guru ' || i, 'GURU', NOW());
    
    INSERT INTO teachers (id, user_id, nip, created_at) VALUES
    (gen_random_uuid(), (SELECT id FROM users WHERE username = 'guru' || i), 'NIP' || LPAD(i::text, 6, '0'), NOW());
  END LOOP;
END $$;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check academic years
SELECT '✓ Academic Years' as check_item, COUNT(*) as count FROM academic_years;

-- Check classes per year
SELECT '✓ Classes 2024/2025' as check_item, COUNT(*) as count FROM classes WHERE academic_year_id = '11111111-1111-1111-1111-111111111111';
SELECT '✓ Classes 2025/2026' as check_item, COUNT(*) as count FROM classes WHERE academic_year_id = '22222222-2222-2222-2222-222222222222';

-- Check students per school level
SELECT 
  '✓ Students per level' as check_item,
  c.school_level,
  c.grade_level,
  COUNT(s.id) as student_count
FROM students s
JOIN classes c ON s.class_id = c.id
WHERE c.academic_year_id = '11111111-1111-1111-1111-111111111111'
GROUP BY c.school_level, c.grade_level
ORDER BY c.school_level, c.grade_level;

-- Check total students
SELECT '✓ Total Students' as check_item, COUNT(*) as count FROM students WHERE status = 'ACTIVE';

-- Check enrollments
SELECT '✓ Active Enrollments' as check_item, COUNT(*) as count FROM student_enrollments WHERE status = 'ACTIVE';

-- Check teachers
SELECT '✓ Total Teachers' as check_item, COUNT(*) as count FROM teachers;

-- ============================================
-- SUMMARY
-- ============================================
/*
CREATED:
- 2 Academic Years (2024/2025, 2025/2026)
- 24 Classes total (12 per year: 6 SMP + 6 SMA)
- 150 Students (50 MP1, 50 MP2, 50 MA1) in 2024/2025
- 150 Active Enrollments
- 10 Teachers
- 5 Subjects

READY TO TEST:
1. Batch Promotion: MP1-A → MP2-A (25 students)
2. Batch Promotion: MP1-B → MP2-B (25 students)
3. Batch Promotion: MP2-A → MP3-A (25 students)
4. Batch Promotion: MA1-A → MA2-A (25 students)
5. SMP to SMA transition: MP3 → MA1 (after creating MP3 students)

Auto-mapping will work: MP1-A → MP2-A, MP1-B → MP2-B, etc.
*/
