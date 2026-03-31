-- inject-dummy-ssa.sql
-- Inject kuis, ulangan, UTS/UAS + nilai dummy untuk SSA SCHOOL saja
-- Jalankan di Supabase SQL Editor
-- School ID: f128ce1c-8014-41a8-9183-75e2e823fce1

-- ═══════════════════════════════════════════════════════════
-- CONFIG
-- ═══════════════════════════════════════════════════════════
DO $$ BEGIN RAISE NOTICE '🏫 Target: SSA SCHOOL (f128ce1c-8014-41a8-9183-75e2e823fce1)'; END $$;

-- ═══════════════════════════════════════════════════════════
-- STEP 0: CLEANUP OLD DATA FOR SSA SCHOOL ONLY
-- ═══════════════════════════════════════════════════════════
DO $$
DECLARE
    v_school_id UUID := 'f128ce1c-8014-41a8-9183-75e2e823fce1';
    ta_ids UUID[];
BEGIN
    -- Get teaching assignment IDs for this school
    SELECT array_agg(ta.id) INTO ta_ids
    FROM teaching_assignments ta
    JOIN teachers t ON t.id = ta.teacher_id
    WHERE t.school_id = v_school_id;

    IF ta_ids IS NULL THEN
        RAISE NOTICE 'No teaching assignments found for SSA School. Skipping cleanup.';
        RETURN;
    END IF;

    -- Delete exam answers/submissions for these TAs
    DELETE FROM exam_answers WHERE submission_id IN (
        SELECT es.id FROM exam_submissions es
        JOIN exams e ON e.id = es.exam_id
        WHERE e.teaching_assignment_id = ANY(ta_ids)
    );
    DELETE FROM exam_submissions WHERE exam_id IN (
        SELECT e.id FROM exams e WHERE e.teaching_assignment_id = ANY(ta_ids)
    );

    -- Delete quiz submissions
    DELETE FROM quiz_submissions WHERE quiz_id IN (
        SELECT q.id FROM quizzes q WHERE q.teaching_assignment_id = ANY(ta_ids)
    );

    -- Delete official exam submissions
    DELETE FROM official_exam_answers WHERE submission_id IN (
        SELECT oes.id FROM official_exam_submissions oes
        JOIN official_exams oe ON oe.id = oes.exam_id
        WHERE oe.school_id = v_school_id
    );
    DELETE FROM official_exam_submissions WHERE exam_id IN (
        SELECT oe.id FROM official_exams oe WHERE oe.school_id = v_school_id
    );

    RAISE NOTICE 'Cleanup done for SSA School!';
END $$;

-- ═══════════════════════════════════════════════════════════
-- STEP 1: CREATE QUIZZES (1 per TA) — SSA SCHOOL ONLY
-- ═══════════════════════════════════════════════════════════
DO $$
DECLARE
    v_school_id UUID := 'f128ce1c-8014-41a8-9183-75e2e823fce1';
    ta RECORD;
    quiz_id UUID;
    i INT;
BEGIN
    FOR ta IN
        SELECT t.id AS ta_id, t.class_id, t.subject_id, s.name AS subject_name, c.name AS class_name
        FROM teaching_assignments t
        JOIN subjects s ON s.id = t.subject_id
        JOIN classes c ON c.id = t.class_id
        JOIN teachers tc ON tc.id = t.teacher_id
        WHERE tc.school_id = v_school_id
        AND NOT EXISTS (
            SELECT 1 FROM quizzes q WHERE q.teaching_assignment_id = t.id AND q.is_active = true
        )
    LOOP
        INSERT INTO quizzes (teaching_assignment_id, title, description, duration_minutes, is_randomized, is_active, pending_publish)
        VALUES (
            ta.ta_id,
            'Kuis ' || ta.subject_name || ' - ' || ta.class_name,
            'Kuis otomatis untuk testing',
            30, true, true, false
        )
        RETURNING id INTO quiz_id;

        FOR i IN 1..5 LOOP
            INSERT INTO quiz_questions (quiz_id, question_text, question_type, options, correct_answer, points, order_index, difficulty, status)
            VALUES (
                quiz_id,
                'Soal ' || i || ' ' || ta.subject_name || ': Manakah jawaban yang benar?',
                'MULTIPLE_CHOICE',
                '["Pilihan A", "Pilihan B", "Pilihan C", "Pilihan D"]'::jsonb,
                (ARRAY['A','B','C','D'])[floor(random()*4+1)::int],
                10, i,
                (ARRAY['EASY','MEDIUM','HARD'])[floor(random()*3+1)::int],
                'approved'
            );
        END LOOP;

        RAISE NOTICE 'Created quiz: % / %', ta.class_name, ta.subject_name;
    END LOOP;
END $$;

-- ═══════════════════════════════════════════════════════════
-- STEP 2: CREATE EXAMS (1 per TA) — SSA SCHOOL ONLY
-- ═══════════════════════════════════════════════════════════
DO $$
DECLARE
    v_school_id UUID := 'f128ce1c-8014-41a8-9183-75e2e823fce1';
    ta RECORD;
    exam_id UUID;
    i INT;
BEGIN
    FOR ta IN
        SELECT t.id AS ta_id, t.class_id, t.subject_id, s.name AS subject_name, c.name AS class_name
        FROM teaching_assignments t
        JOIN subjects s ON s.id = t.subject_id
        JOIN classes c ON c.id = t.class_id
        JOIN teachers tc ON tc.id = t.teacher_id
        WHERE tc.school_id = v_school_id
        AND NOT EXISTS (
            SELECT 1 FROM exams e WHERE e.teaching_assignment_id = t.id AND e.is_active = true
        )
    LOOP
        INSERT INTO exams (teaching_assignment_id, title, description, start_time, duration_minutes, is_randomized, is_active, max_violations, pending_publish)
        VALUES (
            ta.ta_id,
            'Ulangan ' || ta.subject_name || ' - ' || ta.class_name,
            'Ulangan otomatis untuk testing',
            now() - interval '7 days', 60, true, true, 3, false
        )
        RETURNING id INTO exam_id;

        FOR i IN 1..5 LOOP
            INSERT INTO exam_questions (exam_id, question_text, question_type, options, correct_answer, points, order_index, difficulty, status)
            VALUES (
                exam_id,
                'Soal Ulangan ' || i || ' ' || ta.subject_name || ': Pilih jawaban yang tepat.',
                'MULTIPLE_CHOICE',
                '["Opsi A", "Opsi B", "Opsi C", "Opsi D"]'::jsonb,
                (ARRAY['A','B','C','D'])[floor(random()*4+1)::int],
                20, i,
                (ARRAY['EASY','MEDIUM','HARD'])[floor(random()*3+1)::int],
                'approved'
            );
        END LOOP;

        RAISE NOTICE 'Created exam: % / %', ta.class_name, ta.subject_name;
    END LOOP;
END $$;

-- ═══════════════════════════════════════════════════════════
-- STEP 3: CREATE OFFICIAL EXAMS UTS + UAS (per Subject) — SSA SCHOOL ONLY
-- ═══════════════════════════════════════════════════════════
DO $$
DECLARE
    v_school_id UUID := 'f128ce1c-8014-41a8-9183-75e2e823fce1';
    subj RECORD;
    oe_id UUID;
    i INT;
    v_year_id UUID;
    v_class_ids UUID[];
    v_admin_user_id UUID;
BEGIN
    -- Get active academic year
    SELECT id INTO v_year_id FROM academic_years WHERE is_active = true AND school_id = v_school_id LIMIT 1;
    IF v_year_id IS NULL THEN
        RAISE NOTICE 'No active academic year for SSA School. Skipping UTS/UAS.';
        RETURN;
    END IF;

    -- Get admin user ID for created_by
    SELECT u.id INTO v_admin_user_id FROM users u WHERE u.school_id = v_school_id AND u.role = 'ADMIN' LIMIT 1;
    IF v_admin_user_id IS NULL THEN
        SELECT u.id INTO v_admin_user_id FROM users u WHERE u.school_id = v_school_id LIMIT 1;
    END IF;

    -- Get unique subjects taught in this school
    FOR subj IN
        SELECT DISTINCT s.id AS subject_id, s.name AS subject_name
        FROM teaching_assignments ta
        JOIN subjects s ON s.id = ta.subject_id
        JOIN teachers t ON t.id = ta.teacher_id
        WHERE t.school_id = v_school_id
          AND ta.academic_year_id = v_year_id
    LOOP
        -- Get all class IDs that have this subject
        SELECT array_agg(DISTINCT ta.class_id) INTO v_class_ids
        FROM teaching_assignments ta
        JOIN teachers t ON t.id = ta.teacher_id
        WHERE t.school_id = v_school_id
          AND ta.subject_id = subj.subject_id
          AND ta.academic_year_id = v_year_id;

        -- Create UTS if not exists
        IF NOT EXISTS (
            SELECT 1 FROM official_exams oe
            WHERE oe.school_id = v_school_id AND oe.subject_id = subj.subject_id AND oe.exam_type = 'UTS'
        ) THEN
            INSERT INTO official_exams (school_id, academic_year_id, subject_id, exam_type, title, description, start_time, duration_minutes, is_randomized, max_violations, target_class_ids, created_by, is_active)
            VALUES (
                v_school_id, v_year_id, subj.subject_id, 'UTS',
                'UTS ' || subj.subject_name,
                'Ujian Tengah Semester ' || subj.subject_name,
                now() - interval '14 days', 90, true, 3,
                v_class_ids, v_admin_user_id, true
            )
            RETURNING id INTO oe_id;

            FOR i IN 1..10 LOOP
                INSERT INTO official_exam_questions (exam_id, question_text, question_type, options, correct_answer, points, order_index, difficulty, status)
                VALUES (
                    oe_id,
                    'Soal UTS ' || i || ' ' || subj.subject_name || ': Pilih jawaban yang paling tepat.',
                    'MULTIPLE_CHOICE',
                    '["Opsi A", "Opsi B", "Opsi C", "Opsi D"]'::jsonb,
                    (ARRAY['A','B','C','D'])[floor(random()*4+1)::int],
                    10, i,
                    (ARRAY['EASY','MEDIUM','HARD'])[floor(random()*3+1)::int],
                    'approved'
                );
            END LOOP;
            RAISE NOTICE 'Created UTS: %', subj.subject_name;
        END IF;

        -- Create UAS if not exists
        IF NOT EXISTS (
            SELECT 1 FROM official_exams oe
            WHERE oe.school_id = v_school_id AND oe.subject_id = subj.subject_id AND oe.exam_type = 'UAS'
        ) THEN
            INSERT INTO official_exams (school_id, academic_year_id, subject_id, exam_type, title, description, start_time, duration_minutes, is_randomized, max_violations, target_class_ids, created_by, is_active)
            VALUES (
                v_school_id, v_year_id, subj.subject_id, 'UAS',
                'UAS ' || subj.subject_name,
                'Ujian Akhir Semester ' || subj.subject_name,
                now() - interval '7 days', 120, true, 3,
                v_class_ids, v_admin_user_id, true
            )
            RETURNING id INTO oe_id;

            FOR i IN 1..10 LOOP
                INSERT INTO official_exam_questions (exam_id, question_text, question_type, options, correct_answer, points, order_index, difficulty, status)
                VALUES (
                    oe_id,
                    'Soal UAS ' || i || ' ' || subj.subject_name || ': Pilih jawaban yang paling tepat.',
                    'MULTIPLE_CHOICE',
                    '["Opsi A", "Opsi B", "Opsi C", "Opsi D"]'::jsonb,
                    (ARRAY['A','B','C','D'])[floor(random()*4+1)::int],
                    10, i,
                    (ARRAY['EASY','MEDIUM','HARD'])[floor(random()*3+1)::int],
                    'approved'
                );
            END LOOP;
            RAISE NOTICE 'Created UAS: %', subj.subject_name;
        END IF;
    END LOOP;
END $$;

-- ═══════════════════════════════════════════════════════════
-- STEP 4: INJECT QUIZ SUBMISSIONS — SSA SCHOOL ONLY
-- ═══════════════════════════════════════════════════════════
DO $$
DECLARE
    v_school_id UUID := 'f128ce1c-8014-41a8-9183-75e2e823fce1';
    q RECORD;
    s RECORD;
    skill FLOAT;
    question RECORD;
    v_total_score INT;
    v_max_score INT;
    answers JSONB;
    is_correct BOOLEAN;
    pts INT;
    answer TEXT;
    started TIMESTAMP;
    correct_ans TEXT;
BEGIN
    FOR q IN
        SELECT qz.id AS quiz_id, qz.duration_minutes, ta.class_id
        FROM quizzes qz
        JOIN teaching_assignments ta ON ta.id = qz.teaching_assignment_id
        JOIN teachers t ON t.id = ta.teacher_id
        WHERE t.school_id = v_school_id AND qz.is_active = true
    LOOP
        FOR s IN
            SELECT st.id AS student_id
            FROM students st
            WHERE st.class_id = q.class_id
            AND NOT EXISTS (
                SELECT 1 FROM quiz_submissions qs
                WHERE qs.quiz_id = q.quiz_id AND qs.student_id = st.id
            )
        LOOP
            skill := random();
            v_total_score := 0;
            v_max_score := 0;
            answers := '[]'::jsonb;
            started := now() - (random() * interval '14 days');

            FOR question IN
                SELECT qq.id, qq.question_type, qq.correct_answer, qq.points
                FROM quiz_questions qq WHERE qq.quiz_id = q.quiz_id
            LOOP
                v_max_score := v_max_score + COALESCE(question.points, 10);
                correct_ans := COALESCE(UPPER(question.correct_answer), 'A');

                is_correct := random() < (0.5 + skill * 0.4);
                IF is_correct THEN
                    answer := correct_ans;
                    pts := COALESCE(question.points, 10);
                ELSE
                    answer := (ARRAY['A','B','C','D'])[floor(random()*4+1)::int];
                    IF answer = correct_ans THEN
                        answer := CASE answer WHEN 'A' THEN 'B' WHEN 'B' THEN 'C' WHEN 'C' THEN 'D' ELSE 'A' END;
                    END IF;
                    pts := 0;
                END IF;

                v_total_score := v_total_score + pts;
                answers := answers || jsonb_build_array(jsonb_build_object(
                    'question_id', question.id,
                    'answer', answer,
                    'is_correct', is_correct,
                    'score', pts
                ));
            END LOOP;

            INSERT INTO quiz_submissions (quiz_id, student_id, started_at, submitted_at, answers, total_score, max_score, is_graded)
            VALUES (q.quiz_id, s.student_id, started,
                    started + (random() * COALESCE(q.duration_minutes, 30) * interval '1 minute'),
                    answers, v_total_score, v_max_score, true);
        END LOOP;
    END LOOP;
    RAISE NOTICE '✅ Quiz submissions injected for SSA School!';
END $$;

-- ═══════════════════════════════════════════════════════════
-- STEP 5: INJECT EXAM (ULANGAN) SUBMISSIONS — SSA SCHOOL ONLY
-- ═══════════════════════════════════════════════════════════
DO $$
DECLARE
    v_school_id UUID := 'f128ce1c-8014-41a8-9183-75e2e823fce1';
    e RECORD;
    s RECORD;
    skill FLOAT;
    question RECORD;
    v_total_score INT;
    v_max_score INT;
    sub_id UUID;
    is_correct BOOLEAN;
    pts INT;
    answer TEXT;
    started TIMESTAMP;
    q_order JSONB;
    correct_ans TEXT;
BEGIN
    FOR e IN
        SELECT ex.id AS exam_id, ex.duration_minutes, ta.class_id
        FROM exams ex
        JOIN teaching_assignments ta ON ta.id = ex.teaching_assignment_id
        JOIN teachers t ON t.id = ta.teacher_id
        WHERE t.school_id = v_school_id AND ex.is_active = true
    LOOP
        FOR s IN
            SELECT st.id AS student_id
            FROM students st
            WHERE st.class_id = e.class_id
            AND NOT EXISTS (
                SELECT 1 FROM exam_submissions es
                WHERE es.exam_id = e.exam_id AND es.student_id = st.id
            )
        LOOP
            skill := random();
            v_total_score := 0;
            started := now() - (random() * interval '14 days');

            SELECT to_jsonb(array_agg(eq.id ORDER BY random())) INTO q_order
            FROM exam_questions eq WHERE eq.exam_id = e.exam_id;

            SELECT COALESCE(SUM(eq.points), 0) INTO v_max_score
            FROM exam_questions eq WHERE eq.exam_id = e.exam_id;

            INSERT INTO exam_submissions (exam_id, student_id, started_at, submitted_at, is_submitted, is_graded, max_score, question_order, total_score)
            VALUES (e.exam_id, s.student_id, started,
                    started + (random() * COALESCE(e.duration_minutes, 60) * interval '1 minute'),
                    true, true, v_max_score, q_order, 0)
            RETURNING id INTO sub_id;

            v_total_score := 0;
            FOR question IN
                SELECT eq.id, eq.question_type, eq.correct_answer, eq.points
                FROM exam_questions eq WHERE eq.exam_id = e.exam_id
            LOOP
                correct_ans := COALESCE(UPPER(question.correct_answer), 'A');

                is_correct := random() < (0.5 + skill * 0.4);
                IF is_correct THEN
                    answer := correct_ans;
                    pts := COALESCE(question.points, 20);
                ELSE
                    answer := (ARRAY['A','B','C','D'])[floor(random()*4+1)::int];
                    IF answer = correct_ans THEN
                        answer := CASE answer WHEN 'A' THEN 'B' WHEN 'B' THEN 'C' WHEN 'C' THEN 'D' ELSE 'A' END;
                    END IF;
                    pts := 0;
                END IF;

                v_total_score := v_total_score + pts;
                INSERT INTO exam_answers (submission_id, question_id, answer, is_correct, points_earned)
                VALUES (sub_id, question.id, answer, is_correct, pts);
            END LOOP;

            UPDATE exam_submissions SET total_score = v_total_score WHERE id = sub_id;
        END LOOP;
    END LOOP;
    RAISE NOTICE '✅ Exam submissions injected for SSA School!';
END $$;

-- ═══════════════════════════════════════════════════════════
-- STEP 6: INJECT OFFICIAL EXAM (UTS/UAS) SUBMISSIONS — SSA SCHOOL
-- ═══════════════════════════════════════════════════════════
DO $$
DECLARE
    v_school_id UUID := 'f128ce1c-8014-41a8-9183-75e2e823fce1';
    oe RECORD;
    s RECORD;
    skill FLOAT;
    question RECORD;
    v_total_score INT;
    v_max_score INT;
    sub_id UUID;
    is_correct BOOLEAN;
    pts INT;
    answer TEXT;
    started TIMESTAMP;
    q_order JSONB;
    correct_ans TEXT;
    v_class_ids UUID[];
BEGIN
    FOR oe IN
        SELECT oex.id AS exam_id, oex.duration_minutes, oex.target_class_ids
        FROM official_exams oex
        WHERE oex.school_id = v_school_id AND oex.is_active = true
    LOOP
        -- Loop through each target class
        IF oe.target_class_ids IS NULL THEN
            CONTINUE;
        END IF;

        FOR s IN
            SELECT st.id AS student_id
            FROM students st
            WHERE st.class_id = ANY(oe.target_class_ids)
            AND NOT EXISTS (
                SELECT 1 FROM official_exam_submissions oes
                WHERE oes.exam_id = oe.exam_id AND oes.student_id = st.id
            )
        LOOP
            skill := random();
            v_total_score := 0;
            started := now() - (random() * interval '14 days');

            SELECT to_jsonb(array_agg(oq.id ORDER BY random())) INTO q_order
            FROM official_exam_questions oq WHERE oq.exam_id = oe.exam_id;

            SELECT COALESCE(SUM(oq.points), 0) INTO v_max_score
            FROM official_exam_questions oq WHERE oq.exam_id = oe.exam_id;

            INSERT INTO official_exam_submissions (exam_id, student_id, started_at, submitted_at, is_submitted, is_graded, max_score, question_order, total_score)
            VALUES (oe.exam_id, s.student_id, started,
                    started + (random() * COALESCE(oe.duration_minutes, 90) * interval '1 minute'),
                    true, true, v_max_score, q_order, 0)
            RETURNING id INTO sub_id;

            v_total_score := 0;
            FOR question IN
                SELECT oq.id, oq.question_type, oq.correct_answer, oq.points
                FROM official_exam_questions oq WHERE oq.exam_id = oe.exam_id
            LOOP
                correct_ans := COALESCE(UPPER(question.correct_answer), 'A');

                is_correct := random() < (0.5 + skill * 0.4);
                IF is_correct THEN
                    answer := correct_ans;
                    pts := COALESCE(question.points, 10);
                ELSE
                    answer := (ARRAY['A','B','C','D'])[floor(random()*4+1)::int];
                    IF answer = correct_ans THEN
                        answer := CASE answer WHEN 'A' THEN 'B' WHEN 'B' THEN 'C' WHEN 'C' THEN 'D' ELSE 'A' END;
                    END IF;
                    pts := 0;
                END IF;

                v_total_score := v_total_score + pts;
                INSERT INTO official_exam_answers (submission_id, question_id, answer, is_correct, points_earned)
                VALUES (sub_id, question.id, answer, is_correct, pts);
            END LOOP;

            UPDATE official_exam_submissions SET total_score = v_total_score WHERE id = sub_id;
        END LOOP;
    END LOOP;
    RAISE NOTICE '✅ Official exam (UTS/UAS) submissions injected for SSA School!';
END $$;

-- ═══════════════════════════════════════════════════════════
-- STEP 7: VERIFY
-- ═══════════════════════════════════════════════════════════
SELECT 'quizzes (SSA)' AS tabel, count(*) AS jumlah
FROM quizzes q
JOIN teaching_assignments ta ON ta.id = q.teaching_assignment_id
JOIN teachers t ON t.id = ta.teacher_id
WHERE t.school_id = 'f128ce1c-8014-41a8-9183-75e2e823fce1' AND q.is_active = true

UNION ALL

SELECT 'exams (SSA)', count(*)
FROM exams e
JOIN teaching_assignments ta ON ta.id = e.teaching_assignment_id
JOIN teachers t ON t.id = ta.teacher_id
WHERE t.school_id = 'f128ce1c-8014-41a8-9183-75e2e823fce1' AND e.is_active = true

UNION ALL

SELECT 'official_exams (SSA)', count(*)
FROM official_exams WHERE school_id = 'f128ce1c-8014-41a8-9183-75e2e823fce1' AND is_active = true

UNION ALL

SELECT 'quiz_submissions (SSA)', count(*)
FROM quiz_submissions qs
JOIN quizzes q ON q.id = qs.quiz_id
JOIN teaching_assignments ta ON ta.id = q.teaching_assignment_id
JOIN teachers t ON t.id = ta.teacher_id
WHERE t.school_id = 'f128ce1c-8014-41a8-9183-75e2e823fce1'

UNION ALL

SELECT 'exam_submissions (SSA)', count(*)
FROM exam_submissions es
JOIN exams e ON e.id = es.exam_id
JOIN teaching_assignments ta ON ta.id = e.teaching_assignment_id
JOIN teachers t ON t.id = ta.teacher_id
WHERE t.school_id = 'f128ce1c-8014-41a8-9183-75e2e823fce1' AND es.is_submitted = true

UNION ALL

SELECT 'official_exam_submissions (SSA)', count(*)
FROM official_exam_submissions oes
JOIN official_exams oe ON oe.id = oes.exam_id
WHERE oe.school_id = 'f128ce1c-8014-41a8-9183-75e2e823fce1' AND oes.is_submitted = true;
