import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/supabase'
import { validateSession } from '@/lib/auth'

// Helper: Supabase single-relation selects sometimes type as array
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function unwrap(val: any): any {
    if (Array.isArray(val)) return val[0] ?? null
    return val
}

// GET: Fetch wali kelas data for the logged-in teacher
export async function GET(request: NextRequest) {
    try {
        const token = request.cookies.get('session_token')?.value
        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const user = await validateSession(token)
        if (!user || user.role !== 'GURU') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Get teacher ID
        const { data: teacher } = await supabase
            .from('teachers')
            .select('id')
            .eq('user_id', user.id)
            .single()

        if (!teacher) {
            return NextResponse.json({ error: 'Teacher not found' }, { status: 404 })
        }

        // Get class(es) where this teacher is wali kelas
        const { data: classes, error: classError } = await supabase
            .from('classes')
            .select(`
                id, name, grade_level, school_level,
                academic_year:academic_years(id, name, is_active)
            `)
            .eq('homeroom_teacher_id', teacher.id)

        if (classError) throw classError

        if (!classes || classes.length === 0) {
            return NextResponse.json({ classes: [], students: [], grades: [] })
        }

        // Unwrap academic_year for each class (Supabase may return as array)
        const classesUnwrapped = classes.map((c: any) => ({
            ...c,
            academic_year: unwrap(c.academic_year)
        }))

        // Prioritize class from active academic year
        const activeYearClass = classesUnwrapped.find((c: any) => c.academic_year?.is_active)
        const classId = request.nextUrl.searchParams.get('class_id') || activeYearClass?.id || classesUnwrapped[0]?.id

        if (!classId) {
            return NextResponse.json({ classes, students: [], grades: [] })
        }

        // Get students in this class
        const { data: students, error: studentsError } = await supabase
            .from('students')
            .select(`
                id, nis, status,
                user:users!students_user_id_fkey(id, full_name, username)
            `)
            .eq('class_id', classId)
            .eq('status', 'ACTIVE')
            .order('nis', { ascending: true })

        if (studentsError) throw studentsError

        // Get all teaching assignments for this class (to know which subjects)
        const { data: teachingAssignments, error: taError } = await supabase
            .from('teaching_assignments')
            .select(`
                id,
                subject:subjects(id, name),
                academic_year:academic_years(id, is_active)
            `)
            .eq('class_id', classId)

        if (taError) throw taError

        // Filter to active academic year assignments
        const activeAssignments = (teachingAssignments || []).filter(
            (ta) => unwrap(ta.academic_year)?.is_active
        )
        const taIds = activeAssignments.map((ta) => ta.id)

        if (taIds.length === 0 || !students || students.length === 0) {
            return NextResponse.json({
                classes,
                students: students || [],
                subjects: activeAssignments.map((ta) => unwrap(ta.subject)),
                grades: []
            })
        }

        const studentIds = students.map((s) => s.id)

        // Fetch all grades across subjects for these students
        // 1. Assignment submissions + grades
        const { data: submissions } = await supabase
            .from('student_submissions')
            .select(`
                id, student_id, assignment_id, submitted_at,
                assignment:assignments(id, title, teaching_assignment_id, type)
            `)
            .in('student_id', studentIds)

        // Filter submissions to only those for this class's teaching assignments
        const relevantSubmissions = (submissions || []).filter((s: any) =>
            taIds.includes(s.assignment?.teaching_assignment_id)
        )

        const submissionIds = relevantSubmissions.map((s: any) => s.id)

        let grades: any[] = []
        if (submissionIds.length > 0) {
            const { data: gradeData } = await supabase
                .from('grades')
                .select('*')
                .in('submission_id', submissionIds)
            grades = gradeData || []
        }

        // 2. Quiz submissions
        const { data: quizzes } = await supabase
            .from('quizzes')
            .select('id, title, teaching_assignment_id')
            .in('teaching_assignment_id', taIds)

        const quizIds = (quizzes || []).map((q) => q.id)

        let quizSubmissions: any[] = []
        if (quizIds.length > 0) {
            const { data: qSubs } = await supabase
                .from('quiz_submissions')
                .select('id, quiz_id, student_id, total_score, max_score, is_graded')
                .in('quiz_id', quizIds)
                .in('student_id', studentIds)
                .not('submitted_at', 'is', null)
            quizSubmissions = qSubs || []
        }

        // 3. Exam submissions
        const { data: exams } = await supabase
            .from('exams')
            .select('id, title, teaching_assignment_id')
            .in('teaching_assignment_id', taIds)

        const examIds = (exams || []).map((e) => e.id)

        let examSubmissions: any[] = []
        if (examIds.length > 0) {
            const { data: eSubs } = await supabase
                .from('exam_submissions')
                .select('id, exam_id, student_id, total_score, is_submitted')
                .in('exam_id', examIds)
                .in('student_id', studentIds)
                .eq('is_submitted', true)
            examSubmissions = eSubs || []
        }

        // Build per-student, per-subject grade summary
        const studentGrades = studentIds.map((studentId: string) => {
            const subjectScores: Record<string, {
                subject_id: string
                subject_name: string
                tugas_scores: number[]
                kuis_scores: number[]
                ulangan_scores: number[]
            }> = {}

            // Initialize subjects
            activeAssignments.forEach((ta) => {
                const subj = unwrap(ta.subject)
                if (subj && !subjectScores[subj.id]) {
                    subjectScores[subj.id] = {
                        subject_id: subj.id,
                        subject_name: subj.name,
                        tugas_scores: [],
                        kuis_scores: [],
                        ulangan_scores: []
                    }
                }
            })

            // Assignment grades (tugas)
            relevantSubmissions
                .filter((s: any) => s.student_id === studentId)
                .forEach((sub: any) => {
                    const grade = grades.find((g: any) => g.submission_id === sub.id)
                    if (grade) {
                        const ta = activeAssignments.find((a) => a.id === sub.assignment?.teaching_assignment_id)
                        const subj = ta ? unwrap(ta.subject) : null
                        if (subj && subjectScores[subj.id]) {
                            subjectScores[subj.id].tugas_scores.push(grade.score)
                        }
                    }
                })

            // Quiz scores
            quizSubmissions
                .filter((qs: any) => qs.student_id === studentId)
                .forEach((qs: any) => {
                    const quiz = (quizzes || []).find((q) => q.id === qs.quiz_id)
                    if (quiz) {
                        const ta = activeAssignments.find((a) => a.id === quiz.teaching_assignment_id)
                        const subj = ta ? unwrap(ta.subject) : null
                        if (subj && subjectScores[subj.id]) {
                            const score = qs.max_score > 0
                                ? Math.round((qs.total_score / qs.max_score) * 100)
                                : 0
                            subjectScores[subj.id].kuis_scores.push(score)
                        }
                    }
                })

            // Exam scores
            examSubmissions
                .filter((es: any) => es.student_id === studentId)
                .forEach((es: any) => {
                    const exam = (exams || []).find((e) => e.id === es.exam_id)
                    if (exam) {
                        const ta = activeAssignments.find((a) => a.id === exam.teaching_assignment_id)
                        const subj = ta ? unwrap(ta.subject) : null
                        if (subj && subjectScores[subj.id]) {
                            subjectScores[subj.id].ulangan_scores.push(es.total_score || 0)
                        }
                    }
                })

            return {
                student_id: studentId,
                subjects: subjectScores
            }
        })

        return NextResponse.json({
            classes,
            current_class_id: classId,
            students: students || [],
            subjects: activeAssignments.map((ta) => unwrap(ta.subject)).filter(
                (s: any, i: number, arr: any[]) => s && arr.findIndex((x: any) => x?.id === s.id) === i
            ),
            student_grades: studentGrades,
            // Raw data for detail view
            raw: {
                assignments: relevantSubmissions,
                grades,
                quizzes: quizzes || [],
                quiz_submissions: quizSubmissions,
                exams: exams || [],
                exam_submissions: examSubmissions
            }
        })
    } catch (error) {
        console.error('Error fetching wali kelas data:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}
