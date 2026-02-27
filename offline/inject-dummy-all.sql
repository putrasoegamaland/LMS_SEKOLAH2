-- inject-dummy-all.sql
-- Buat kuis & ulangan dummy untuk SEMUA teaching assignment, lalu inject nilai siswa
-- Jalankan di Supabase SQL Editor

-- ═══════════════════════════════════════════════════════════
-- STEP 0: CLEANUP OLD SUBMISSIONS (supaya bisa re-run)
-- ═══════════════════════════════════════════════════════════
DELETE FROM exam_answers;
DELETE FROM exam_submissions;
DELETE FROM quiz_submissions;

-- ═══════════════════════════════════════════════════════════
-- STEP 1: CREATE QUIZZES + QUESTIONS FOR EACH TA (1 quiz per TA)
-- ═══════════════════════════════════════════════════════════
DO $$
DECLARE
    ta RECORD;
    quiz_id UUID;
    subject_name TEXT;
    i INT;
BEGIN
    FOR ta IN
        SELECT t.id AS ta_id, t.class_id, t.subject_id, s.name AS subject_name, c.name AS class_name
        FROM teaching_assignments t
        JOIN subjects s ON s.id = t.subject_id
        JOIN classes c ON c.id = t.class_id
        WHERE NOT EXISTS (
            SELECT 1 FROM quizzes q WHERE q.teaching_assignment_id = t.id AND q.is_active = true
        )
    LOOP
        -- Create quiz
        INSERT INTO quizzes (teaching_assignment_id, title, description, duration_minutes, is_randomized, is_active, pending_publish)
        VALUES (
            ta.ta_id,
            'Kuis ' || ta.subject_name || ' - ' || ta.class_name,
            'Kuis otomatis untuk testing analitik',
            30,
            true,
            true,
            false
        )
        RETURNING id INTO quiz_id;

        -- Create 5 multiple choice questions
        FOR i IN 1..5 LOOP
            INSERT INTO quiz_questions (quiz_id, question_text, question_type, options, correct_answer, points, order_index, difficulty, status)
            VALUES (
                quiz_id,
                'Soal ' || i || ' ' || ta.subject_name || ': Manakah jawaban yang benar?',
                'MULTIPLE_CHOICE',
                '["Pilihan A", "Pilihan B", "Pilihan C", "Pilihan D"]'::jsonb,
                (ARRAY['A','B','C','D'])[floor(random()*4+1)::int],
                10,
                i,
                (ARRAY['EASY','MEDIUM','HARD'])[floor(random()*3+1)::int],
                'approved'
            );
        END LOOP;

        RAISE NOTICE 'Created quiz for % / %', ta.class_name, ta.subject_name;
    END LOOP;
END $$;

-- ═══════════════════════════════════════════════════════════
-- STEP 2: CREATE EXAMS + QUESTIONS FOR EACH TA (1 exam per TA)
-- ═══════════════════════════════════════════════════════════
DO $$
DECLARE
    ta RECORD;
    exam_id UUID;
    i INT;
BEGIN
    FOR ta IN
        SELECT t.id AS ta_id, t.class_id, t.subject_id, s.name AS subject_name, c.name AS class_name
        FROM teaching_assignments t
        JOIN subjects s ON s.id = t.subject_id
        JOIN classes c ON c.id = t.class_id
        WHERE NOT EXISTS (
            SELECT 1 FROM exams e WHERE e.teaching_assignment_id = t.id AND e.is_active = true
        )
    LOOP
        INSERT INTO exams (teaching_assignment_id, title, description, start_time, duration_minutes, is_randomized, is_active, max_violations, pending_publish)
        VALUES (
            ta.ta_id,
            'UTS ' || ta.subject_name || ' - ' || ta.class_name,
            'Ulangan otomatis untuk testing analitik',
            now() - interval '7 days',
            60,
            true,
            true,
            3,
            false
        )
        RETURNING id INTO exam_id;

        -- Create 5 multiple choice questions
        FOR i IN 1..5 LOOP
            INSERT INTO exam_questions (exam_id, question_text, question_type, options, correct_answer, points, order_index, difficulty, status)
            VALUES (
                exam_id,
                'Soal UTS ' || i || ' ' || ta.subject_name || ': Pilih jawaban yang tepat.',
                'MULTIPLE_CHOICE',
                '["Opsi A", "Opsi B", "Opsi C", "Opsi D"]'::jsonb,
                (ARRAY['A','B','C','D'])[floor(random()*4+1)::int],
                20,
                i,
                (ARRAY['EASY','MEDIUM','HARD'])[floor(random()*3+1)::int],
                'approved'
            );
        END LOOP;

        RAISE NOTICE 'Created exam for % / %', ta.class_name, ta.subject_name;
    END LOOP;
END $$;

-- ═══════════════════════════════════════════════════════════
-- STEP 3: INJECT QUIZ SUBMISSIONS
-- ═══════════════════════════════════════════════════════════
DO $$
DECLARE
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
        WHERE qz.is_active = true
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

                IF question.question_type = 'MULTIPLE_CHOICE' THEN
                    is_correct := random() < (0.6 + skill * 0.35);
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
                ELSE
                    pts := round(COALESCE(question.points, 10) * (0.65 + skill * 0.3))::int;
                    is_correct := NULL;
                    answer := 'Jawaban essay siswa.';
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
    RAISE NOTICE 'Quiz submissions injected!';
END $$;

-- ═══════════════════════════════════════════════════════════
-- STEP 4: INJECT EXAM SUBMISSIONS + ANSWERS
-- ═══════════════════════════════════════════════════════════
DO $$
DECLARE
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
        WHERE ex.is_active = true
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

                IF question.question_type = 'MULTIPLE_CHOICE' THEN
                    is_correct := random() < (0.6 + skill * 0.35);
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
                ELSE
                    pts := round(COALESCE(question.points, 20) * (0.65 + skill * 0.3))::int;
                    is_correct := NULL;
                    answer := 'Jawaban essay siswa.';
                END IF;

                v_total_score := v_total_score + pts;
                INSERT INTO exam_answers (submission_id, question_id, answer, is_correct, points_earned)
                VALUES (sub_id, question.id, answer, is_correct, pts);
            END LOOP;

            UPDATE exam_submissions SET total_score = v_total_score WHERE id = sub_id;
        END LOOP;
    END LOOP;
    RAISE NOTICE 'Exam submissions injected!';
END $$;

-- ═══════════════════════════════════════════════════════════
-- STEP 5: VERIFY
-- ═══════════════════════════════════════════════════════════
SELECT 'quizzes' AS tabel, count(*) AS jumlah FROM quizzes WHERE is_active = true
UNION ALL
SELECT 'exams', count(*) FROM exams WHERE is_active = true
UNION ALL
SELECT 'quiz_submissions', count(*) FROM quiz_submissions
UNION ALL
SELECT 'exam_submissions', count(*) FROM exam_submissions WHERE is_submitted = true
UNION ALL
SELECT 'exam_answers', count(*) FROM exam_answers;
