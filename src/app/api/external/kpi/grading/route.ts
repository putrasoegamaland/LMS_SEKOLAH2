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
        const limit = parseInt(request.nextUrl.searchParams.get('limit') || '1000') // Fetch more for aggregation

        // We need to fetch grades and link them back to assignments and teachers
        // Path: grades -> student_submissions -> assignments -> teaching_assignments -> teacher_id

        // 1. Fetch grades with relations
        let query = supabase
            .from('grades')
            .select(`
                id,
                score,
                feedback,
                graded_at,
                submission:student_submissions(
                    id,
                    submitted_at,
                    assignment:assignments(
                        id,
                        title,
                        type,
                        teaching_assignment:teaching_assignments(
                            id,
                            teacher_id,
                            subject:subjects(name),
                            class:classes(name)
                        )
                    )
                )
            `)
            .order('graded_at', { ascending: false })
            .limit(limit)

        const { data: rawGrades, error } = await query

        if (error) throw error

        // 2. Filter by teacher in memory (due to nested relation filtering limitations)
        let filteredGrades = rawGrades || []
        if (teacherId) {
            filteredGrades = filteredGrades.filter((g: any) =>
                g.submission?.assignment?.teaching_assignment?.teacher_id === teacherId
            )
        }

        // 3. Process KPI Data
        const processedData = filteredGrades.map((g: any) => {
            const submittedAt = new Date(g.submission?.submitted_at).getTime()
            const gradedAt = new Date(g.graded_at).getTime()
            const gradingTimeHours = (gradedAt - submittedAt) / (1000 * 60 * 60)

            // SLA: Graded within 3 days (72 hours)
            const withinSLA = gradingTimeHours <= 72

            // Feedback Quality: Word count
            const feedbackWords = g.feedback ? g.feedback.trim().split(/\s+/).length : 0

            return {
                grade_id: g.id,
                teacher_id: g.submission?.assignment?.teaching_assignment?.teacher_id,
                subject: g.submission?.assignment?.teaching_assignment?.subject?.name,
                class: g.submission?.assignment?.teaching_assignment?.class?.name,
                assignment_title: g.submission?.assignment?.title,
                grading_time_hours: parseFloat(gradingTimeHours.toFixed(2)),
                within_sla: withinSLA,
                feedback_word_count: feedbackWords,
                has_feedback: feedbackWords > 0
            }
        })

        // 4. Aggregation (Optional: Client can do this, but providing avg here helps)
        const totalGrades = processedData.length
        const totalGradingTime = processedData.reduce((sum, item) => sum + item.grading_time_hours, 0)
        const slaCompliantCount = processedData.filter(item => item.within_sla).length
        const totalFeedbackWords = processedData.reduce((sum, item) => sum + item.feedback_word_count, 0)

        // Avoid division by zero
        const avgGradingTime = totalGrades > 0 ? (totalGradingTime / totalGrades) : 0
        const slaComplianceRate = totalGrades > 0 ? (slaCompliantCount / totalGrades) * 100 : 0
        const avgFeedbackWords = totalGrades > 0 ? (totalFeedbackWords / totalGrades) : 0

        return NextResponse.json({
            meta: {
                total_processed: totalGrades,
                avg_grading_time_hours: parseFloat(avgGradingTime.toFixed(2)),
                sla_compliance_rate_percent: parseFloat(slaComplianceRate.toFixed(2)),
                avg_feedback_word_count: parseFloat(avgFeedbackWords.toFixed(2))
            },
            data: processedData
        })
    } catch (error) {
        console.error('Error fetching grading KPI:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}
