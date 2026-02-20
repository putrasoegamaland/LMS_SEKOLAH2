import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { validateSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
    try {
        // 1. Auth Check
        const token = request.cookies.get('session_token')?.value
        const user = await validateSession(token || '')
        if (!user || user.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // 2. Fetch Data
        const [
            { data: teachers },
            { data: teachingAssignments },
            { data: materials },
            { data: assignments },
            { data: exams },
            { data: quizzes },
            { data: submissions },
            { data: grades },
            { data: examSubmissions },
            { data: quizSubmissions }
        ] = await Promise.all([
            supabase.from('teachers').select('id, user:users(full_name, id)'),
            // Added class:classes(school_level) to get level
            supabase.from('teaching_assignments').select('id, teacher_id, subject_id, subject:subjects(name), class:classes(school_level)'),
            supabase.from('materials').select('id, teaching_assignment_id, created_at'),
            supabase.from('assignments').select('id, teaching_assignment_id, created_at, due_date, type'),
            supabase.from('exams').select('id, teaching_assignment_id, created_at, start_time'),
            supabase.from('quizzes').select('id, teaching_assignment_id, created_at'),
            supabase.from('student_submissions').select('id, assignment_id, submitted_at'),
            supabase.from('grades').select('id, submission_id, score, feedback, graded_at'),
            supabase.from('exam_submissions').select('id, exam_id, total_score'),
            supabase.from('quiz_submissions').select('id, quiz_id, total_score')
        ])

        if (!teachers) return NextResponse.json([])

        // 3. Mapping & Grouping
        const taMap = new Map() // ta_id -> teacher_id

        // Group Definition: "${SchoolLevel}:${SubjectName}"
        // Teacher -> Groups -> C1 Score Components
        const benchmarkGroups: Record<string, { teacherId: string, c1_score: number }[]> = {}
        const teacherGroupsMap = new Map<string, Set<string>>() // teacherId -> Set(groupKeys)

        teachingAssignments?.forEach(ta => {
            taMap.set(ta.id, ta.teacher_id)

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const level = (ta.class as any)?.school_level || 'UNKNOWN'
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const subject = (ta.subject as any)?.name || 'UNKNOWN'
            const groupKey = `${level}:${subject}`

            if (!benchmarkGroups[groupKey]) benchmarkGroups[groupKey] = []

            if (!teacherGroupsMap.has(ta.teacher_id)) teacherGroupsMap.set(ta.teacher_id, new Set())
            teacherGroupsMap.get(ta.teacher_id)?.add(groupKey)
        })

        // Initialize Stats
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const stats: Record<string, any> = {}
        teachers.forEach(t => {
            stats[t.id] = {
                teacher: t,
                subjects: new Set(),
                materials_count: 0,
                assignments_total: 0,
                assignments_ontime: 0,
                exams_total: 0,
                exams_ontime: 0,
                quizzes_total: 0,
                grading_times: [],
                grades_total: 0,
                grades_with_feedback: 0,
                submissions_count: 0,

                // For C1 (Performance Index)
                c1_components: {
                    exam_scores: [],
                    quiz_scores: [],
                    task_scores: []
                },
                all_scores: []
            }
        })

        // Populate Subjects from Assignments (Fix for missing subjects)
        teachingAssignments?.forEach(ta => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const subjectName = (ta.subject as any)?.name
            if (stats[ta.teacher_id] && subjectName) {
                stats[ta.teacher_id].subjects.add(subjectName)
            }
        })

        // Helper
        const addSubjectName = (taId: string) => {
            const ta = teachingAssignments?.find(t => t.id === taId)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const subjectName = (ta?.subject as any)?.name
            if (ta && subjectName) {
                stats[ta.teacher_id].subjects.add(subjectName)
            }
        }

        // --- Aggregation logic reuse ---

        // A Metrics
        materials?.forEach(m => {
            const tid = taMap.get(m.teaching_assignment_id)
            if (stats[tid]) {
                stats[tid].materials_count++
                addSubjectName(m.teaching_assignment_id)
            }
        })

        assignments?.forEach(a => {
            const tid = taMap.get(a.teaching_assignment_id)
            if (!stats[tid]) return
            if (a.type !== 'TUGAS') return
            stats[tid].assignments_total++
            if (a.due_date) {
                const diff = (new Date(a.due_date).getTime() - new Date(a.created_at).getTime()) / (86400000)
                if (diff >= 3) stats[tid].assignments_ontime++
            }
        })

        exams?.forEach(e => {
            const tid = taMap.get(e.teaching_assignment_id)
            if (!stats[tid]) return
            stats[tid].exams_total++
            if (e.start_time) {
                const diff = (new Date(e.start_time).getTime() - new Date(e.created_at).getTime()) / (86400000)
                if (diff >= 7) stats[tid].exams_ontime++
            }
        })

        quizzes?.forEach(q => {
            const tid = taMap.get(q.teaching_assignment_id)
            if (stats[tid]) stats[tid].quizzes_total++
        })

        // B, D & C Metrics (Grades)
        const subAssignmentMap = new Map()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        submissions?.forEach(s => subAssignmentMap.set(s.id, s))

        grades?.forEach(g => {
            const sub = subAssignmentMap.get(g.submission_id)
            if (!sub) return
            const assignment = assignments?.find(a => a.id === sub.assignment_id)
            if (!assignment) return
            const tid = taMap.get(assignment.teaching_assignment_id)
            if (!stats[tid]) return

            stats[tid].grades_total++
            if (g.feedback && g.feedback.length > 5) stats[tid].grades_with_feedback++

            if (assignment.type === 'TUGAS') {
                stats[tid].c1_components.task_scores.push(g.score)
                stats[tid].all_scores.push(g.score)
            }

            const hours = (new Date(g.graded_at).getTime() - new Date(sub.submitted_at).getTime()) / 3600000
            if (hours > 0) stats[tid].grading_times.push(hours)
        })

        submissions?.forEach(s => {
            const assignment = assignments?.find(a => a.id === s.assignment_id)
            if (assignment) {
                const tid = taMap.get(assignment.teaching_assignment_id)
                if (stats[tid]) stats[tid].submissions_count++
            }
        })

        examSubmissions?.forEach(es => {
            const exam = exams?.find(e => e.id === es.exam_id)
            if (exam) {
                const tid = taMap.get(exam.teaching_assignment_id)
                if (stats[tid]) {
                    stats[tid].c1_components.exam_scores.push(es.total_score)
                    stats[tid].all_scores.push(es.total_score)
                }
            }
        })

        quizSubmissions?.forEach(qs => {
            const quiz = quizzes?.find(q => q.id === qs.quiz_id)
            if (quiz) {
                const tid = taMap.get(quiz.teaching_assignment_id)
                if (stats[tid]) {
                    stats[tid].c1_components.quiz_scores.push(qs.total_score)
                    stats[tid].all_scores.push(qs.total_score)
                }
            }
        })

        // 4. Calculate Individual Scores
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        Object.values(stats).forEach((s: any) => {
            const avg_exam = s.c1_components.exam_scores.length > 0 ? s.c1_components.exam_scores.reduce((a: number, b: number) => a + b, 0) / s.c1_components.exam_scores.length : 0
            const avg_quiz = s.c1_components.quiz_scores.length > 0 ? s.c1_components.quiz_scores.reduce((a: number, b: number) => a + b, 0) / s.c1_components.quiz_scores.length : 0
            const avg_task = s.c1_components.task_scores.length > 0 ? s.c1_components.task_scores.reduce((a: number, b: number) => a + b, 0) / s.c1_components.task_scores.length : 0

            s.c1_perf_index = (avg_exam * 0.5) + (avg_quiz * 0.3) + (avg_task * 0.2)
        })

        // Populate benchmark groups
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        Object.values(stats).forEach((s: any) => {
            const tid = s.teacher.id
            const groups = teacherGroupsMap.get(tid)
            if (groups) {
                groups.forEach(gKey => {
                    if (!benchmarkGroups[gKey]) benchmarkGroups[gKey] = []
                    benchmarkGroups[gKey].push({ teacherId: tid, c1_score: s.c1_perf_index })
                })
            }
        })

        // Calculate Rank in each group
        const teacherBenchmarks: Record<string, number[]> = {} // tid -> [percentiles]

        Object.entries(benchmarkGroups).forEach(([, members]) => {
            // Sort by Score Desc
            members.sort((a, b) => b.c1_score - a.c1_score)

            members.forEach((m, index) => {
                const rank = index + 1
                const total = members.length
                const percentile = (1 - (rank - 1) / total) * 100

                if (!teacherBenchmarks[m.teacherId]) teacherBenchmarks[m.teacherId] = []
                teacherBenchmarks[m.teacherId].push(percentile)
            })
        })

        // Finalize Data
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const teacherMetrics = Object.values(stats).map((s: any) => {
            const a2_pct = s.assignments_total > 0 ? (s.assignments_ontime / s.assignments_total) * 100 : 100
            const a3_pct = s.exams_total > 0 ? (s.exams_ontime / s.exams_total) * 100 : 100
            const activity_score = (s.materials_count * 1) + (s.assignments_total * 2) + (s.quizzes_total * 2) + (s.exams_total * 3)
            const avg_grading_speed = s.grading_times.length > 0 ? s.grading_times.reduce((a: number, b: number) => a + b, 0) / s.grading_times.length : 0
            const grading_within_sla = s.grading_times.filter((t: number) => t <= (7 * 24)).length
            const b2_sla_pct = s.grading_times.length > 0 ? (grading_within_sla / s.grading_times.length) * 100 : 100
            const scores_passed = s.all_scores.filter((sc: number) => sc >= 75).length
            const c3_pass_ratio = s.all_scores.length > 0 ? (scores_passed / s.all_scores.length) * 100 : 0
            const d1_coverage = s.submissions_count > 0 ? (s.grades_total / s.submissions_count) * 100 : 100
            const d2_feedback = s.grades_total > 0 ? (s.grades_with_feedback / s.grades_total) * 100 : 0

            // C2 Average Benchmark
            const benchmarks = teacherBenchmarks[s.teacher.id] || []
            const c2_benchmark = benchmarks.length > 0
                ? benchmarks.reduce((a, b) => a + b, 0) / benchmarks.length
                : 0 // No peers? or 100?

            return {
                teacher_id: s.teacher.id,
                name: s.teacher.user?.full_name || 'Unknown',
                subjects: Array.from(s.subjects),
                a1_materials: s.materials_count,
                a2_ontime_assignment: parseFloat(a2_pct.toFixed(1)),
                a3_ontime_exam: parseFloat(a3_pct.toFixed(1)),
                a4_ontime_quiz: 100, // Placeholder
                a5_activity_score: activity_score,
                b1_grading_speed: parseFloat(avg_grading_speed.toFixed(1)),
                b2_grading_sla: parseFloat(b2_sla_pct.toFixed(1)),
                c1_perf_index: parseFloat(s.c1_perf_index.toFixed(1)),
                c2_subject_benchmark: parseFloat(c2_benchmark.toFixed(1)),
                c3_pass_ratio: parseFloat(c3_pass_ratio.toFixed(1)),
                d1_coverage: parseFloat(d1_coverage.toFixed(1)),
                d2_feedback_quality: parseFloat(d2_feedback.toFixed(1)),
            }
        })

        return NextResponse.json({
            data: teacherMetrics,
            meta: {
                total_teachers: teacherMetrics.length,
                generated_at: new Date().toISOString()
            }
        })

    } catch (error) {
        console.error('School Observer API Error:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
