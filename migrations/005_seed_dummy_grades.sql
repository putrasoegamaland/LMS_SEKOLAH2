-- ============================================
-- SCRIPT: Create Dummy Grades Data (FIXED v2)
-- Untuk testing halaman Analitik
-- ============================================

-- ============================================
-- STEP 1: Create Quizzes untuk setiap teaching assignment
-- ============================================

INSERT INTO quizzes (id, teaching_assignment_id, title, description, duration_minutes, is_active)
SELECT 
    gen_random_uuid(),
    ta.id,
    'Kuis ' || s.name || ' - ' || c.name,
    'Kuis untuk mata pelajaran ' || s.name,
    30,
    true
FROM teaching_assignments ta
JOIN subjects s ON ta.subject_id = s.id
JOIN classes c ON ta.class_id = c.id
JOIN academic_years ay ON ta.academic_year_id = ay.id
WHERE ay.is_active = true
ON CONFLICT DO NOTHING;

-- ============================================
-- STEP 2: Create Quiz Questions (5 soal per quiz)
-- ============================================

INSERT INTO quiz_questions (id, quiz_id, question_text, question_type, options, correct_answer, points)
SELECT 
    gen_random_uuid(),
    q.id,
    'Pertanyaan 1: Apa jawaban yang benar?',
    'MULTIPLE_CHOICE',
    '["A. Jawaban A", "B. Jawaban B", "C. Jawaban C", "D. Jawaban D"]'::jsonb,
    'A',
    20
FROM quizzes q
ON CONFLICT DO NOTHING;

INSERT INTO quiz_questions (id, quiz_id, question_text, question_type, options, correct_answer, points)
SELECT gen_random_uuid(), q.id, 'Pertanyaan 2: Pilih jawaban yang tepat.', 'MULTIPLE_CHOICE', '["A. Pilihan 1", "B. Pilihan 2", "C. Pilihan 3", "D. Pilihan 4"]'::jsonb, 'B', 20 FROM quizzes q ON CONFLICT DO NOTHING;

INSERT INTO quiz_questions (id, quiz_id, question_text, question_type, options, correct_answer, points)
SELECT gen_random_uuid(), q.id, 'Pertanyaan 3: Tentukan jawaban.', 'MULTIPLE_CHOICE', '["A. Opsi A", "B. Opsi B", "C. Opsi C", "D. Opsi D"]'::jsonb, 'C', 20 FROM quizzes q ON CONFLICT DO NOTHING;

INSERT INTO quiz_questions (id, quiz_id, question_text, question_type, options, correct_answer, points)
SELECT gen_random_uuid(), q.id, 'Pertanyaan 4: Manakah yang benar?', 'MULTIPLE_CHOICE', '["A. Benar A", "B. Benar B", "C. Benar C", "D. Benar D"]'::jsonb, 'D', 20 FROM quizzes q ON CONFLICT DO NOTHING;

INSERT INTO quiz_questions (id, quiz_id, question_text, question_type, options, correct_answer, points)
SELECT gen_random_uuid(), q.id, 'Pertanyaan 5: Selesaikan soal ini.', 'MULTIPLE_CHOICE', '["A. Solusi 1", "B. Solusi 2", "C. Solusi 3", "D. Solusi 4"]'::jsonb, 'A', 20 FROM quizzes q ON CONFLICT DO NOTHING;

-- ============================================
-- STEP 3: Create Quiz Submissions untuk semua siswa
-- ============================================

INSERT INTO quiz_submissions (id, quiz_id, student_id, answers, total_score, max_score, started_at, submitted_at)
SELECT 
    gen_random_uuid(),
    q.id,
    st.id,
    '{}'::jsonb,
    floor(random() * 51 + 50)::integer,
    100,
    NOW() - INTERVAL '7 days',
    NOW() - INTERVAL '7 days' + INTERVAL '25 minutes'
FROM quizzes q
JOIN teaching_assignments ta ON q.teaching_assignment_id = ta.id
JOIN students st ON st.class_id = ta.class_id
JOIN academic_years ay ON ta.academic_year_id = ay.id
WHERE ay.is_active = true AND st.status = 'ACTIVE'
ON CONFLICT DO NOTHING;

-- ============================================
-- STEP 4: Create Exams (Ulangan)
-- ============================================

INSERT INTO exams (id, teaching_assignment_id, title, description, start_time, duration_minutes, is_randomized, max_violations)
SELECT 
    gen_random_uuid(),
    ta.id,
    'Ulangan Harian ' || s.name,
    'Ulangan harian untuk ' || s.name,
    NOW() - INTERVAL '5 days',
    45,
    true,
    3
FROM teaching_assignments ta
JOIN subjects s ON ta.subject_id = s.id
JOIN academic_years ay ON ta.academic_year_id = ay.id
WHERE ay.is_active = true
ON CONFLICT DO NOTHING;

-- ============================================
-- STEP 5: Create Exam Questions (10 soal per exam)
-- ============================================

INSERT INTO exam_questions (id, exam_id, question_text, question_type, options, correct_answer, points)
SELECT gen_random_uuid(), e.id, 'Soal Ulangan 1', 'MULTIPLE_CHOICE', '["A", "B", "C", "D"]'::jsonb, 'A', 10 FROM exams e ON CONFLICT DO NOTHING;

INSERT INTO exam_questions (id, exam_id, question_text, question_type, options, correct_answer, points)
SELECT gen_random_uuid(), e.id, 'Soal Ulangan 2', 'MULTIPLE_CHOICE', '["A", "B", "C", "D"]'::jsonb, 'B', 10 FROM exams e ON CONFLICT DO NOTHING;

INSERT INTO exam_questions (id, exam_id, question_text, question_type, options, correct_answer, points)
SELECT gen_random_uuid(), e.id, 'Soal Ulangan 3', 'MULTIPLE_CHOICE', '["A", "B", "C", "D"]'::jsonb, 'C', 10 FROM exams e ON CONFLICT DO NOTHING;

INSERT INTO exam_questions (id, exam_id, question_text, question_type, options, correct_answer, points)
SELECT gen_random_uuid(), e.id, 'Soal Ulangan 4', 'MULTIPLE_CHOICE', '["A", "B", "C", "D"]'::jsonb, 'D', 10 FROM exams e ON CONFLICT DO NOTHING;

INSERT INTO exam_questions (id, exam_id, question_text, question_type, options, correct_answer, points)
SELECT gen_random_uuid(), e.id, 'Soal Ulangan 5', 'MULTIPLE_CHOICE', '["A", "B", "C", "D"]'::jsonb, 'A', 10 FROM exams e ON CONFLICT DO NOTHING;

INSERT INTO exam_questions (id, exam_id, question_text, question_type, options, correct_answer, points)
SELECT gen_random_uuid(), e.id, 'Soal Ulangan 6', 'MULTIPLE_CHOICE', '["A", "B", "C", "D"]'::jsonb, 'B', 10 FROM exams e ON CONFLICT DO NOTHING;

INSERT INTO exam_questions (id, exam_id, question_text, question_type, options, correct_answer, points)
SELECT gen_random_uuid(), e.id, 'Soal Ulangan 7', 'MULTIPLE_CHOICE', '["A", "B", "C", "D"]'::jsonb, 'C', 10 FROM exams e ON CONFLICT DO NOTHING;

INSERT INTO exam_questions (id, exam_id, question_text, question_type, options, correct_answer, points)
SELECT gen_random_uuid(), e.id, 'Soal Ulangan 8', 'MULTIPLE_CHOICE', '["A", "B", "C", "D"]'::jsonb, 'D', 10 FROM exams e ON CONFLICT DO NOTHING;

INSERT INTO exam_questions (id, exam_id, question_text, question_type, options, correct_answer, points)
SELECT gen_random_uuid(), e.id, 'Soal Ulangan 9', 'MULTIPLE_CHOICE', '["A", "B", "C", "D"]'::jsonb, 'A', 10 FROM exams e ON CONFLICT DO NOTHING;

INSERT INTO exam_questions (id, exam_id, question_text, question_type, options, correct_answer, points)
SELECT gen_random_uuid(), e.id, 'Soal Ulangan 10', 'MULTIPLE_CHOICE', '["A", "B", "C", "D"]'::jsonb, 'B', 10 FROM exams e ON CONFLICT DO NOTHING;

-- ============================================
-- STEP 6: Create Exam Submissions untuk semua siswa
-- (tanpa 'answers' column - menggunakan struktur yang benar)
-- ============================================

INSERT INTO exam_submissions (id, exam_id, student_id, total_score, max_score, is_submitted, started_at, submitted_at)
SELECT 
    gen_random_uuid(),
    e.id,
    st.id,
    floor(random() * 41 + 60)::integer,  -- random score 60-100
    100,
    true,
    NOW() - INTERVAL '3 days',
    NOW() - INTERVAL '3 days' + INTERVAL '40 minutes'
FROM exams e
JOIN teaching_assignments ta ON e.teaching_assignment_id = ta.id
JOIN students st ON st.class_id = ta.class_id
JOIN academic_years ay ON ta.academic_year_id = ay.id
WHERE ay.is_active = true AND st.status = 'ACTIVE'
ON CONFLICT DO NOTHING;

-- ============================================
-- STEP 7: Verifikasi Hasil
-- ============================================

SELECT 'Quizzes Created' as metric, COUNT(*) as count FROM quizzes
UNION ALL
SELECT 'Quiz Questions', COUNT(*) FROM quiz_questions
UNION ALL
SELECT 'Quiz Submissions', COUNT(*) FROM quiz_submissions
UNION ALL
SELECT 'Exams Created', COUNT(*) FROM exams
UNION ALL
SELECT 'Exam Questions', COUNT(*) FROM exam_questions
UNION ALL
SELECT 'Exam Submissions', COUNT(*) FROM exam_submissions;
