-- inject-grades.sql
-- Jalankan di Supabase SQL Editor untuk inject nilai siswa
-- Aman dijalankan berkali-kali (skip siswa yang sudah punya submission)

-- ═══════════════════════════════════════════
-- 1. INJECT QUIZ SUBMISSIONS
-- ═══════════════════════════════════════════
DO $$
DECLARE
    q RECORD;
    s RECORD;
    skill FLOAT;
    question RECORD;
    total_score INT;
    max_score INT;
    answers JSONB;
    is_correct BOOLEAN;
    pts INT;
    answer TEXT;
    started TIMESTAMP;
BEGIN
    -- Loop through active quizzes
    FOR q IN
        SELECT qz.id AS quiz_id, qz.duration_minutes, ta.class_id
        FROM quizzes qz
        JOIN teaching_assignments ta ON ta.id = qz.teaching_assignment_id
        WHERE qz.is_active = true
    LOOP
        -- Loop through students in that class who DON'T already have a submission
        FOR s IN
            SELECT st.id AS student_id
            FROM students st
            WHERE st.class_id = q.class_id
            AND NOT EXISTS (
                SELECT 1 FROM quiz_submissions qs
                WHERE qs.quiz_id = q.quiz_id AND qs.student_id = st.id
            )
        LOOP
            skill := random(); -- 0..1 skill level per student
            total_score := 0;
            max_score := 0;
            answers := '[]'::jsonb;
            started := now() - (random() * interval '14 days');

            -- Build answers for each question
            FOR question IN
                SELECT qq.id, qq.question_type, qq.correct_answer, qq.points
                FROM quiz_questions qq
                WHERE qq.quiz_id = q.quiz_id
            LOOP
                max_score := max_score + COALESCE(question.points, 10);

                IF question.question_type = 'MULTIPLE_CHOICE' THEN
                    is_correct := random() < (0.3 + skill * 0.5);
                    IF is_correct THEN
                        answer := COALESCE(UPPER(question.correct_answer), 'A');
                        pts := COALESCE(question.points, 10);
                    ELSE
                        -- Pick wrong answer
                        answer := (ARRAY['A','B','C','D'])[floor(random()*4+1)::int];
                        IF answer = COALESCE(UPPER(question.correct_answer), 'A') THEN
                            answer := CASE answer WHEN 'A' THEN 'B' WHEN 'B' THEN 'C' WHEN 'C' THEN 'D' ELSE 'A' END;
                        END IF;
                        pts := 0;
                    END IF;
                    total_score := total_score + pts;
                    answers := answers || jsonb_build_array(jsonb_build_object(
                        'question_id', question.id,
                        'answer', answer,
                        'is_correct', is_correct,
                        'score', pts
                    ));
                ELSE
                    -- Essay: random partial score
                    pts := round(COALESCE(question.points, 10) * (0.3 + skill * 0.6))::int;
                    total_score := total_score + pts;
                    answers := answers || jsonb_build_array(jsonb_build_object(
                        'question_id', question.id,
                        'answer', 'Jawaban essay siswa.',
                        'is_correct', NULL,
                        'score', pts
                    ));
                END IF;
            END LOOP;

            -- Insert the submission
            INSERT INTO quiz_submissions (quiz_id, student_id, started_at, submitted_at, answers, total_score, max_score, is_graded)
            VALUES (
                q.quiz_id,
                s.student_id,
                started,
                started + (random() * COALESCE(q.duration_minutes, 30) * interval '1 minute'),
                answers,
                total_score,
                max_score,
                true
            );
        END LOOP;
    END LOOP;

    RAISE NOTICE 'Quiz submissions injected!';
END $$;

-- ═══════════════════════════════════════════
-- 2. INJECT EXAM SUBMISSIONS + EXAM ANSWERS
-- ═══════════════════════════════════════════
DO $$
DECLARE
    e RECORD;
    s RECORD;
    skill FLOAT;
    question RECORD;
    total_score INT;
    max_score INT;
    sub_id UUID;
    is_correct BOOLEAN;
    pts INT;
    answer TEXT;
    started TIMESTAMP;
    q_order UUID[];
BEGIN
    -- Loop through active exams
    FOR e IN
        SELECT ex.id AS exam_id, ex.duration_minutes, ta.class_id
        FROM exams ex
        JOIN teaching_assignments ta ON ta.id = ex.teaching_assignment_id
        WHERE ex.is_active = true
    LOOP
        -- Loop through students who don't have submissions yet
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
            total_score := 0;
            max_score := 0;
            started := now() - (random() * interval '14 days');

            -- Get question order
            SELECT array_agg(eq.id ORDER BY random()) INTO q_order
            FROM exam_questions eq WHERE eq.exam_id = e.exam_id;

            -- Calculate max score
            SELECT COALESCE(SUM(eq.points), 0) INTO max_score
            FROM exam_questions eq WHERE eq.exam_id = e.exam_id;

            -- Insert submission
            INSERT INTO exam_submissions (exam_id, student_id, started_at, submitted_at, is_submitted, is_graded, max_score, question_order, total_score)
            VALUES (
                e.exam_id,
                s.student_id,
                started,
                started + (random() * COALESCE(e.duration_minutes, 60) * interval '1 minute'),
                true,
                true,
                max_score,
                q_order,
                0 -- will update after inserting answers
            )
            RETURNING id INTO sub_id;

            -- Insert individual answers
            total_score := 0;
            FOR question IN
                SELECT eq.id, eq.question_type, eq.correct_answer, eq.points
                FROM exam_questions eq
                WHERE eq.exam_id = e.exam_id
            LOOP
                IF question.question_type = 'MULTIPLE_CHOICE' THEN
                    is_correct := random() < (0.3 + skill * 0.5);
                    IF is_correct THEN
                        answer := COALESCE(UPPER(question.correct_answer), 'A');
                        pts := COALESCE(question.points, 10);
                    ELSE
                        answer := (ARRAY['A','B','C','D'])[floor(random()*4+1)::int];
                        IF answer = COALESCE(UPPER(question.correct_answer), 'A') THEN
                            answer := CASE answer WHEN 'A' THEN 'B' WHEN 'B' THEN 'C' WHEN 'C' THEN 'D' ELSE 'A' END;
                        END IF;
                        pts := 0;
                    END IF;
                    total_score := total_score + pts;

                    INSERT INTO exam_answers (submission_id, question_id, answer, is_correct, points_earned)
                    VALUES (sub_id, question.id, answer, is_correct, pts);
                ELSE
                    pts := round(COALESCE(question.points, 10) * (0.3 + skill * 0.6))::int;
                    total_score := total_score + pts;

                    INSERT INTO exam_answers (submission_id, question_id, answer, is_correct, points_earned)
                    VALUES (sub_id, question.id, 'Jawaban essay siswa.', NULL, pts);
                END IF;
            END LOOP;

            -- Update total_score
            UPDATE exam_submissions SET total_score = total_score WHERE id = sub_id;
        END LOOP;
    END LOOP;

    RAISE NOTICE 'Exam submissions injected!';
END $$;

-- ═══════════════════════════════════════════
-- 3. VERIFY
-- ═══════════════════════════════════════════
SELECT 'quiz_submissions' AS tabel, count(*) AS jumlah FROM quiz_submissions
UNION ALL
SELECT 'exam_submissions', count(*) FROM exam_submissions
UNION ALL
SELECT 'exam_answers', count(*) FROM exam_answers;
