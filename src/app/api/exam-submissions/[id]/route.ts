import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/supabase'
import { validateSession } from '@/lib/auth'

// GET single exam submission with questions and answers
export async function GET(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const params = await context.params
        const token = request.cookies.get('session_token')?.value
        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const user = await validateSession(token)
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const id = params.id

        const { data, error } = await supabase
            .from('exam_submissions')
            .select(`
                *,
                exam:exams(
                    id,
                    title,
                    questions:exam_questions(*)
                ),
                student:students(
                    id,
                    nis,
                    user:users!students_user_id_fkey(full_name)
                )
            `)
            .eq('id', id)
            .single()

        if (error) throw error

        // Fetch answers from exam_answers table
        const { data: examAnswers, error: answersError } = await supabase
            .from('exam_answers')
            .select('*')
            .eq('submission_id', id)

        if (answersError) throw answersError

        // Map exam_answers to the format the frontend expects
        const answers = (examAnswers || []).map(a => ({
            question_id: a.question_id,
            answer: a.answer,
            is_correct: a.is_correct,
            score: a.points_earned,
            feedback: a.feedback || ''
        }))

        return NextResponse.json({
            ...data,
            answers
        })
    } catch (error) {
        console.error('Error fetching exam submission:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}

// PUT update exam submission (Teacher Grading)
export async function PUT(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const params = await context.params
        const token = request.cookies.get('session_token')?.value
        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const user = await validateSession(token)
        if (!user || user.role !== 'GURU') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const id = params.id
        const { answers, total_score, is_graded } = await request.json()

        // Update individual exam_answers rows with scores and feedback
        if (answers && Array.isArray(answers)) {
            for (const ans of answers) {
                await supabase
                    .from('exam_answers')
                    .update({
                        points_earned: ans.score ?? ans.points_earned ?? 0
                    })
                    .eq('submission_id', id)
                    .eq('question_id', ans.question_id)
            }
        }

        // Update the submission record with total_score and is_graded
        const { data, error } = await supabase
            .from('exam_submissions')
            .update({
                total_score,
                is_graded
            })
            .eq('id', id)
            .select()
            .single()

        if (error) throw error

        return NextResponse.json(data)
    } catch (error) {
        console.error('Error updating exam submission:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}

