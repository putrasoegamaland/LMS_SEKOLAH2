import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { validateSession } from '@/lib/auth'

// M2: Service Role Key required — analytics needs cross-table reads that RLS blocks for anon role.
// Access restricted to ADMIN only.
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET analytics data per class per subject
export async function GET(request: NextRequest) {
    try {
        const token = request.cookies.get('session_token')?.value
        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const user = await validateSession(token)
        if (!user || user.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Admin only' }, { status: 401 })
        }

        const academicYearId = request.nextUrl.searchParams.get('academic_year_id')

        if (!academicYearId) {
            return NextResponse.json({ error: 'academic_year_id required' }, { status: 400 })
        }

        // Get all classes for this academic year
        const { data: classes, error: classesError } = await supabaseAdmin
            .from('classes')
            .select('id, name, school_level, grade_level')
            .eq('academic_year_id', academicYearId)
            .order('name')

        if (classesError) throw classesError

        // Get all subjects
        const { data: subjects, error: subjectsError } = await supabaseAdmin
            .from('subjects')
            .select('id, name')
            .order('name')

        if (subjectsError) throw subjectsError

        // Get all students with their classes
        const { data: students, error: studentsError } = await supabaseAdmin
            .from('students')
            .select('id, nis, class_id, user:users(full_name)')

        if (studentsError) throw studentsError

        // Get teaching assignments for this academic year
        const { data: teachingAssignments, error: taError } = await supabaseAdmin
            .from('teaching_assignments')
            .select('id, class_id, subject_id')
            .eq('academic_year_id', academicYearId)

        if (taError) throw taError

        // P4: Scope all queries by teaching assignment IDs for this academic year
        const taIdList = (teachingAssignments || []).map(t => t.id)
        if (taIdList.length === 0) {
            return NextResponse.json({ classAverages: {}, studentDetails: {} })
        }

        // Get assignments scoped by teaching assignment
        const { data: assignments } = await supabaseAdmin
            .from('assignments')
            .select('id, teaching_assignment_id')
            .in('teaching_assignment_id', taIdList)

        // Get quizzes scoped by teaching assignment
        const { data: quizzes } = await supabaseAdmin
            .from('quizzes')
            .select('id, teaching_assignment_id')
            .in('teaching_assignment_id', taIdList)

        // Get exams scoped by teaching assignment
        const { data: exams } = await supabaseAdmin
            .from('exams')
            .select('id, teaching_assignment_id')
            .in('teaching_assignment_id', taIdList)

        // Get submissions only for scoped assignments/quizzes/exams
        const assignmentIds = (assignments || []).map(a => a.id)
        const quizIds = (quizzes || []).map(q => q.id)
        const examIds = (exams || []).map(e => e.id)

        // Fetch in parallel for speed
        const [studentSubmRes, gradesRes, quizSubRes, examSubRes] = await Promise.all([
            assignmentIds.length > 0
                ? supabaseAdmin.from('student_submissions').select('id, student_id, assignment_id').in('assignment_id', assignmentIds)
                : { data: [], error: null },
            assignmentIds.length > 0
                ? supabaseAdmin.from('grades').select('id, submission_id, score')
                : { data: [], error: null },
            quizIds.length > 0
                ? supabaseAdmin.from('quiz_submissions').select('id, student_id, quiz_id, total_score, max_score, submitted_at').in('quiz_id', quizIds).not('submitted_at', 'is', null)
                : { data: [], error: null },
            examIds.length > 0
                ? supabaseAdmin.from('exam_submissions').select('id, student_id, exam_id, score, submitted_at').in('exam_id', examIds).not('submitted_at', 'is', null)
                : { data: [], error: null }
        ])

        const studentSubmissions = studentSubmRes.data || []
        const grades = gradesRes.data || []
        const quizSubmissions = quizSubRes.data || []
        const examSubmissions = examSubRes.data || []



        // Build a map: class_id -> subject_id -> student grades
        const classSubjectGrades: Record<string, Record<string, { student_id: string; scores: number[] }[]>> = {}

        // Initialize structure
        classes?.forEach(cls => {
            classSubjectGrades[cls.id] = {}
            subjects?.forEach(sub => {
                classSubjectGrades[cls.id][sub.id] = []
            })
        })

        // Helper to add grade
        const addGrade = (classId: string, subjectId: string, studentId: string, score: number) => {
            if (!classSubjectGrades[classId]) return
            if (!classSubjectGrades[classId][subjectId]) {
                classSubjectGrades[classId][subjectId] = []
            }

            let studentGrades = classSubjectGrades[classId][subjectId].find(s => s.student_id === studentId)
            if (!studentGrades) {
                studentGrades = { student_id: studentId, scores: [] }
                classSubjectGrades[classId][subjectId].push(studentGrades)
            }
            if (score !== null && score !== undefined) {
                studentGrades.scores.push(score)
            }
        }

        // Process tugas (assignment) submissions with grades
        studentSubmissions?.forEach(sub => {
            // Find the grade for this submission
            const grade = grades?.find(g => g.submission_id === sub.id)
            if (!grade || grade.score === null || grade.score === undefined) return

            const assignment = assignments?.find(a => a.id === sub.assignment_id)
            if (!assignment) return

            const ta = teachingAssignments?.find(t => t.id === assignment.teaching_assignment_id)
            if (!ta) return

            const student = students?.find(s => s.id === sub.student_id)
            if (!student || student.class_id !== ta.class_id) return

            addGrade(ta.class_id, ta.subject_id, sub.student_id, grade.score)
        })

        // Process quiz submissions
        quizSubmissions?.forEach(qs => {
            // Calculate percentage score (total_score / max_score * 100)
            const quizScore = qs.max_score > 0
                ? (qs.total_score / qs.max_score) * 100
                : qs.total_score

            if (quizScore === null || quizScore === undefined) return

            const quiz = quizzes?.find(q => q.id === qs.quiz_id)
            if (!quiz) return

            const ta = teachingAssignments?.find(t => t.id === quiz.teaching_assignment_id)
            if (!ta) return

            const student = students?.find(s => s.id === qs.student_id)
            if (!student || student.class_id !== ta.class_id) return

            addGrade(ta.class_id, ta.subject_id, qs.student_id, quizScore)
        })

        // Process exam submissions
        examSubmissions?.forEach(es => {
            if (es.score === null || es.score === undefined) return

            const exam = exams?.find(e => e.id === es.exam_id)
            if (!exam) return

            const ta = teachingAssignments?.find(t => t.id === exam.teaching_assignment_id)
            if (!ta) return

            const student = students?.find(s => s.id === es.student_id)
            if (!student || student.class_id !== ta.class_id) return

            addGrade(ta.class_id, ta.subject_id, es.student_id, es.score)
        })

        // Build result
        const result = classes?.map(cls => {
            const classStudents = students?.filter(s => s.class_id === cls.id) || []

            const subjectAverages = subjects?.map(sub => {
                const studentGrades = classSubjectGrades[cls.id]?.[sub.id] || []

                // Calculate average for each student, then overall average
                const studentAverages = studentGrades.map(sg => {
                    const avg = sg.scores.length > 0
                        ? sg.scores.reduce((a, b) => a + b, 0) / sg.scores.length
                        : null
                    return {
                        student_id: sg.student_id,
                        average: avg
                    }
                }).filter(sa => sa.average !== null)

                const overallAvg = studentAverages.length > 0
                    ? studentAverages.reduce((a, b) => a + (b.average || 0), 0) / studentAverages.length
                    : null

                const passCount = studentAverages.filter(sa => (sa.average || 0) >= 75).length
                const failCount = studentAverages.length - passCount

                // Get student details for this subject
                const studentDetails = studentGrades.map(sg => {
                    const student = students?.find(s => s.id === sg.student_id)
                    const avg = sg.scores.length > 0
                        ? sg.scores.reduce((a, b) => a + b, 0) / sg.scores.length
                        : null
                    return {
                        student_id: sg.student_id,
                        student_name: (student?.user as any)?.full_name || '-',
                        student_nis: student?.nis || '-',
                        average: avg,
                        grade_count: sg.scores.length
                    }
                }).sort((a, b) => (a.student_name || '').localeCompare(b.student_name || ''))

                return {
                    subject_id: sub.id,
                    subject_name: sub.name,
                    average: overallAvg,
                    student_count: studentAverages.length,
                    pass_count: passCount,
                    fail_count: failCount,
                    students: studentDetails
                }
            }) || []

            return {
                class_id: cls.id,
                class_name: cls.name,
                school_level: (cls as any).school_level,
                grade_level: (cls as any).grade_level,
                total_students: classStudents.length,
                subjects: subjectAverages
            }
        }) || []

        return NextResponse.json(result)
    } catch (error) {
        console.error('Error fetching analytics:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}
