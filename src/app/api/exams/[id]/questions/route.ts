import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { validateSession } from '@/lib/auth'

// GET questions for exam
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const token = request.cookies.get('session_token')?.value
        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const user = await validateSession(token)
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { data, error } = await supabase
            .from('exam_questions')
            .select('*')
            .eq('exam_id', id)
            .order('order_index', { ascending: true })

        if (error) throw error

        return NextResponse.json(data)
    } catch (error) {
        console.error('Error fetching exam questions:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}

// POST add questions to exam
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const token = request.cookies.get('session_token')?.value
        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const user = await validateSession(token)
        if (!user || user.role !== 'GURU') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { questions } = body

        if (!questions || !Array.isArray(questions)) {
            return NextResponse.json({ error: 'Questions array required' }, { status: 400 })
        }

        // Get current max order
        const { data: existing } = await supabase
            .from('exam_questions')
            .select('order_index')
            .eq('exam_id', id)
            .order('order_index', { ascending: false })
            .limit(1)

        let startOrder = (existing?.[0]?.order_index ?? -1) + 1

        const questionsToInsert = questions.map((q: any, idx: number) => ({
            exam_id: id,
            question_text: q.question_text,
            question_type: q.question_type || 'MULTIPLE_CHOICE',
            options: q.options,
            correct_answer: q.correct_answer,
            difficulty: q.difficulty || 'MEDIUM',
            points: q.points || 1,
            order_index: startOrder + idx,
            image_url: q.image_url || null,
            passage_text: q.passage_text || null
        }))

        const { data, error } = await supabase
            .from('exam_questions')
            .insert(questionsToInsert)
            .select()

        if (error) throw error

        return NextResponse.json(data)
    } catch (error) {
        console.error('Error adding exam questions:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}

// PUT update questions
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const token = request.cookies.get('session_token')?.value
        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const user = await validateSession(token)
        if (!user || user.role !== 'GURU') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { question_id, question_text, options, correct_answer, difficulty, points, image_url } = body

        if (!question_id) {
            return NextResponse.json({ error: 'question_id required' }, { status: 400 })
        }

        const updateData: any = {}
        if (question_text !== undefined) updateData.question_text = question_text
        if (options !== undefined) updateData.options = options
        if (correct_answer !== undefined) updateData.correct_answer = correct_answer
        if (difficulty !== undefined) updateData.difficulty = difficulty
        if (points !== undefined) updateData.points = points
        if (image_url !== undefined) updateData.image_url = image_url

        const { data, error } = await supabase
            .from('exam_questions')
            .update(updateData)
            .eq('id', question_id)
            .eq('exam_id', id)
            .select()
            .single()

        if (error) throw error

        return NextResponse.json(data)
    } catch (error) {
        console.error('Error updating exam question:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}

// DELETE question
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const token = request.cookies.get('session_token')?.value
        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const user = await validateSession(token)
        if (!user || user.role !== 'GURU') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const questionId = request.nextUrl.searchParams.get('question_id')

        if (questionId) {
            // Delete single question
            const { error } = await supabase
                .from('exam_questions')
                .delete()
                .eq('id', questionId)
                .eq('exam_id', id)

            if (error) throw error
        } else {
            // Delete all questions for this exam
            const { error } = await supabase
                .from('exam_questions')
                .delete()
                .eq('exam_id', id)

            if (error) throw error
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error deleting exam question:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}
