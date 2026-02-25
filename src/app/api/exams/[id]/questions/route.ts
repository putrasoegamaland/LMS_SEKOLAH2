import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/supabase'
import { validateSession } from '@/lib/auth'
import { triggerBulkHOTSAnalysis, type TriggerHOTSInput } from '@/lib/triggerHOTS'

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

        let questions = data || []

        // C2 Security Fix: Strip correct_answer for students unless exam is already submitted
        if (user.role === 'SISWA') {
            const { data: student } = await supabase
                .from('students')
                .select('id')
                .eq('user_id', user.id)
                .single()

            let hasSubmitted = false
            if (student) {
                const { data: submission } = await supabase
                    .from('exam_submissions')
                    .select('is_submitted')
                    .eq('exam_id', id)
                    .eq('student_id', student.id)
                    .single()
                hasSubmitted = !!submission?.is_submitted
            }

            if (!hasSubmitted) {
                questions = questions.map(({ correct_answer, ...rest }) => rest)
            }
        }

        return NextResponse.json(questions)
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
            passage_text: q.passage_text || null,
            teacher_hots_claim: q.teacher_hots_claim || false
        }))

        const { data, error } = await supabase
            .from('exam_questions')
            .insert(questionsToInsert)
            .select()

        if (error) throw error

        // Trigger HOTS analysis for each saved question (fire-and-forget)
        if (data && data.length > 0) {
            const { data: exam } = await supabase
                .from('exams')
                .select('teaching_assignment:teaching_assignments(subject:subjects(name), class:classes(school_level))')
                .eq('id', id).single()
            const ta = exam?.teaching_assignment as any
            const subjectName = ta?.subject?.name || ''
            const gradeBand = ta?.class?.school_level || 'SMP'
            const hotsInputs: TriggerHOTSInput[] = data.map((q: any) => ({
                questionId: q.id,
                questionSource: 'exam' as const,
                questionText: q.question_text,
                questionType: q.question_type,
                options: q.options,
                correctAnswer: q.correct_answer,
                teacherDifficulty: q.difficulty,
                teacherHotsClaim: q.teacher_hots_claim || false,
                subjectName,
                gradeBand
            }))
            triggerBulkHOTSAnalysis(hotsInputs)
        }

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
