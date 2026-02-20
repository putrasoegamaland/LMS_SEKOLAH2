const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://veohqmrydavkokfiqvjj.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkData() {
    console.log('Checking database data...');

    // Check Students
    const { data: students, error: studentError } = await supabase.from('students').select('id, user_id, nis');
    if (studentError) {
        console.error('Error fetching students:', studentError);
        return;
    }
    console.log(`Found ${students.length} students.`);

    if (students.length > 0) {
        const studentId = students[0].id; // OR Try a specific student if you know they have grades
        console.log(`Checking grades for first student ID: ${studentId}`);

        // 2. Check Assignments (Grades)
        // Note: The relation structure in API is:
        // grades -> student_submissions -> assignments -> teaching_assignments -> subjects
        const { data: grades, error: gradesError } = await supabase
            .from('grades')
            .select(`
                id,
                score,
                submission:student_submissions(
                    id,
                    student_id,
                    assignment:assignments(
                        id,
                        title,
                        teaching_assignment:teaching_assignments(
                            subject:subjects(name)
                        )
                    )
                )
            `);

        if (gradesError) console.error('Error fetching grades:', gradesError);
        else {
            const studentGrades = grades.filter(g => g.submission && g.submission.student_id === studentId);
            console.log(`Total Grades in DB: ${grades.length}`);
            console.log(`Grades for this student: ${studentGrades.length}`);
            studentGrades.forEach((g, i) => {
                console.log(`Grade ${i + 1}: Score=${g.score}, Subject=${g.submission?.assignment?.teaching_assignment?.subject?.name}`);
            });
        }

        // 3. Check Quiz with Relations
        const { data: quizzes, error: quizError } = await supabase
            .from('quiz_submissions')
            .select(`
                id,
                student_id,
                total_score,
                quiz:quizzes(
                    title,
                    teaching_assignment:teaching_assignments(
                        subject:subjects(name)
                    )
                )
            `)
            .eq('student_id', studentId);

        if (quizError) console.error('Error fetching quizzes:', quizError);
        else {
            console.log(`Quiz Submissions for this student: ${quizzes.length}`);
            quizzes.forEach((q, i) => {
                console.log(`Quiz ${i + 1}: Score=${q.total_score}, Subject=${q.quiz?.teaching_assignment?.subject?.name}`);
            });
        }

        // 4. Check Exam with Relations
        const { data: exams, error: examError } = await supabase
            .from('exam_submissions')
            .select(`
                id,
                student_id,
                total_score,
                exam:exams(
                    title,
                    teaching_assignment:teaching_assignments(
                        subject:subjects(name)
                    )
                )
            `)
            .eq('student_id', studentId);

        if (examError) console.error('Error fetching exams:', examError);
        else {
            console.log(`Exam Submissions for this student: ${exams.length}`);
            exams.forEach((e, i) => {
                console.log(`Exam ${i + 1}: Score=${e.total_score}, Subject=${e.exam?.teaching_assignment?.subject?.name}`);
            });
        }

    } else {
        console.log('No students found.');
    }
}

checkData();
