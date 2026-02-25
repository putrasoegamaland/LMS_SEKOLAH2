import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/supabase'
import { validateSession } from '@/lib/auth'

// GET single submission
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
            .from('quiz_submissions')
            .select(`
                *,
                quiz:quizzes(
                    id,
                    title,
                    questions:quiz_questions(*)
                ),
                student:students(
                    id,
                    nis,
                    user:users(full_name)
                )
            `)
            .eq('id', id)
            .single()

        if (error) throw error

        return NextResponse.json(data)
    } catch (error) {
        console.error('Error fetching quiz submission:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}

// PUT update submission (Teacher Grading)
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

        const { data, error } = await supabase
            .from('quiz_submissions')
            .update({
                answers,
                total_score,
                is_graded
            })
            .eq('id', id)
            .select()
            .single()

        if (error) throw error

        return NextResponse.json(data)
    } catch (error) {
        console.error('Error updating quiz submission:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}
