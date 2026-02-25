import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
    try {
        // Security Check
        const apiKey = request.headers.get('x-api-key')
        if (apiKey !== process.env.EXTERNAL_API_SECRET) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const teacherId = request.nextUrl.searchParams.get('teacher_id')
        const classId = request.nextUrl.searchParams.get('class_id')
        const academicYearId = request.nextUrl.searchParams.get('academic_year_id')

        // 1. Get relevant teaching assignments based on filters
        let taQuery = supabase.from('teaching_assignments').select('id, teacher_id, subject_id, class_id')

        if (teacherId) taQuery = taQuery.eq('teacher_id', teacherId)
        if (classId) taQuery = taQuery.eq('class_id', classId)
        if (academicYearId) taQuery = taQuery.eq('academic_year_id', academicYearId)

        const { data: tas } = await taQuery
        if (!tas || tas.length === 0) return NextResponse.json([])

        const taIds = tas.map(t => t.id)

        // 2. Fetch Assignments Grades (KPI C1)
        // assignment -> teaching_assignment
        const { data: assignmentGrades } = await supabase
            .from('grades')
            .select(`
                score,
                submission:student_submissions(
                    student_id,
                    assignment:assignments(
                        id,
                        title,
                        type,
                        teaching_assignment_id
                    )
                )
            `)
            .in('submission.assignment.teaching_assignment_id', taIds)
        // Note: Supabase might struggle with deep nested in() filtering on some versions/configs.
        // If this fails, we might need to fetch assignments first.
        // Let's assume standard PostgREST behavior where this filter applies if we construct it right.
        // Actually, for deep filter we usually need !inner or equivalent.
        // Let's optimize: Fetch assignments, quizzes, exams linked to these TAs first.

        // Optimized approach:

        // A. External System usually wants aggregated data per student/subject
        // Let's fetch the assessment *containers* first
        const { data: assignments } = await supabase.from('assignments').select('id, teaching_assignment_id, title, type').in('teaching_assignment_id', taIds)
        const { data: quizzes } = await supabase.from('quizzes').select('id, teaching_assignment_id, title').in('teaching_assignment_id', taIds)
        const { data: exams } = await supabase.from('exams').select('id, teaching_assignment_id, title').in('teaching_assignment_id', taIds)

        const assignmentIds = assignments?.map(a => a.id) || []
        const quizIds = quizzes?.map(q => q.id) || []
        const examIds = exams?.map(e => e.id) || []

        // B. Fetch Scores
        const [gradesRes, quizSubRes, examSubRes] = await Promise.all([
            assignmentIds.length > 0 ? supabase.from('grades').select('score, submission:student_submissions(student_id, assignment_id)').in('submission.assignment_id', assignmentIds) : { data: [] },
            quizIds.length > 0 ? supabase.from('quiz_submissions').select('total_score, student_id, quiz_id').in('quiz_id', quizIds) : { data: [] },
            examIds.length > 0 ? supabase.from('exam_submissions').select('total_score, student_id, exam_id').in('exam_id', examIds) : { data: [] }
        ])

        // C. Aggregate
        const studentPerformance: Record<string, any> = {}

        // Process Assignments (C1)
        gradesRes.data?.forEach((g: any) => {
            const studentId = g.submission?.student_id
            const assignment = assignments?.find(a => a.id === g.submission?.assignment_id)
            if (!studentId || !assignment) return

            if (!studentPerformance[studentId]) studentPerformance[studentId] = { student_id: studentId, c1_assignments: [], c2_quizzes: [], c3_exams: [] }

            studentPerformance[studentId].c1_assignments.push({
                title: assignment.title,
                type: assignment.type,
                score: g.score,
                ta_id: assignment.teaching_assignment_id
            })
        })

        // Process Quizzes (C2)
        quizSubRes.data?.forEach((q: any) => {
            const studentId = q.student_id
            const quiz = quizzes?.find(z => z.id === q.quiz_id)
            if (!studentId || !quiz) return

            if (!studentPerformance[studentId]) studentPerformance[studentId] = { student_id: studentId, c1_assignments: [], c2_quizzes: [], c3_exams: [] }

            studentPerformance[studentId].c2_quizzes.push({
                title: quiz.title,
                score: q.total_score,
                ta_id: quiz.teaching_assignment_id
            })
        })

        // Process Exams (C3)
        examSubRes.data?.forEach((e: any) => {
            const studentId = e.student_id
            const exam = exams?.find(x => x.id === e.exam_id)
            if (!studentId || !exam) return

            if (!studentPerformance[studentId]) studentPerformance[studentId] = { student_id: studentId, c1_assignments: [], c2_quizzes: [], c3_exams: [] }

            studentPerformance[studentId].c3_exams.push({
                title: exam.title,
                score: e.total_score,
                ta_id: exam.teaching_assignment_id
            })
        })

        // Calculate Averages
        const aggregated = Object.values(studentPerformance).map(student => {
            const avg = (arr: any[]) => arr.length > 0 ? arr.reduce((a, b) => a + b.score, 0) / arr.length : 0

            return {
                student_id: student.student_id,
                averages: {
                    assignments: parseFloat(avg(student.c1_assignments).toFixed(2)),
                    quizzes: parseFloat(avg(student.c2_quizzes).toFixed(2)),
                    exams: parseFloat(avg(student.c3_exams).toFixed(2))
                },
                details: {
                    assignments: student.c1_assignments.length,
                    quizzes: student.c2_quizzes.length,
                    exams: student.c3_exams.length
                }
            }
        })

        return NextResponse.json({
            meta: {
                total_students: aggregated.length,
                filters: { teacherId, classId, academicYearId }
            },
            data: aggregated
        })

    } catch (error) {
        console.error('Error fetching student performance KPI:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}
