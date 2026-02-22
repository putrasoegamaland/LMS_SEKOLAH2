import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { validateSession } from '@/lib/auth'
import { triggerHOTSAnalysis, triggerBulkHOTSAnalysis, type TriggerHOTSInput } from '@/lib/triggerHOTS'

// GET questions for a quiz
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
            .from('quiz_questions')
            .select('*')
            .eq('quiz_id', id)
            .order('order_index')

        if (error) throw error

        let questions = data || []

        // C1 Security Fix: Strip correct_answer for students unless quiz is already submitted
        if (user.role === 'SISWA') {
            const { data: student } = await supabase
                .from('students')
                .select('id')
                .eq('user_id', user.id)
                .single()

            let hasSubmitted = false
            if (student) {
                const { data: submission } = await supabase
                    .from('quiz_submissions')
                    .select('submitted_at')
                    .eq('quiz_id', id)
                    .eq('student_id', student.id)
                    .single()
                hasSubmitted = !!submission?.submitted_at
            }

            if (!hasSubmitted) {
                questions = questions.map(({ correct_answer, ...rest }) => rest)
            }
        }

        return NextResponse.json(questions)
    } catch (error) {
        console.error('Error fetching questions:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}

// POST add question to quiz
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

        // Handle bulk insert
        if (Array.isArray(body)) {
            const questions = body.map((q: any, idx: number) => ({
                quiz_id: id,
                question_text: q.question_text,
                question_type: q.question_type,
                options: q.options || null,
                correct_answer: q.correct_answer || null,
                difficulty: q.difficulty || 'MEDIUM',
                points: q.points || 10,
                order_index: q.order_index ?? idx,
                image_url: q.image_url || null,
                passage_text: q.passage_text || null,
                teacher_hots_claim: q.teacher_hots_claim || false
            }))

            const { data, error } = await supabase
                .from('quiz_questions')
                .insert(questions)
                .select()

            if (error) throw error

            // Trigger HOTS analysis for each saved question (fire-and-forget)
            if (data && data.length > 0) {
                const { data: quiz } = await supabase
                    .from('quizzes')
                    .select('teaching_assignment:teaching_assignments(subject:subjects(name), class:classes(school_level))')
                    .eq('id', id).single()
                const ta = quiz?.teaching_assignment as any
                const subjectName = ta?.subject?.name || ''
                const gradeBand = ta?.class?.school_level || 'SMP'
                const hotsInputs: TriggerHOTSInput[] = data.map((q: any) => ({
                    questionId: q.id,
                    questionSource: 'quiz' as const,
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
        }

        // Single insert
        const { question_text, question_type, options, correct_answer, difficulty, points, order_index, image_url, passage_text, teacher_hots_claim } = body

        const { data, error } = await supabase
            .from('quiz_questions')
            .insert({
                quiz_id: id,
                question_text,
                question_type,
                options: options || null,
                correct_answer: correct_answer || null,
                difficulty: difficulty || 'MEDIUM',
                points: points || 10,
                order_index: order_index || 0,
                image_url: image_url || null,
                passage_text: passage_text || null,
                teacher_hots_claim: teacher_hots_claim || false
            })
            .select()
            .single()

        if (error) throw error

        // Trigger HOTS analysis for single question (fire-and-forget)
        if (data) {
            const { data: quiz } = await supabase
                .from('quizzes')
                .select('teaching_assignment:teaching_assignments(subject:subjects(name), class:classes(school_level))')
                .eq('id', id).single()
            const ta = quiz?.teaching_assignment as any
            triggerHOTSAnalysis({
                questionId: data.id,
                questionSource: 'quiz',
                questionText: data.question_text,
                questionType: data.question_type,
                options: data.options,
                correctAnswer: data.correct_answer,
                teacherDifficulty: data.difficulty,
                teacherHotsClaim: data.teacher_hots_claim || false,
                subjectName: ta?.subject?.name || '',
                gradeBand: ta?.class?.school_level || 'SMP'
            }).catch(err => console.error('HOTS trigger error:', err))
        }

        return NextResponse.json(data)
    } catch (error) {
        console.error('Error adding question:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}

// PUT update question
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
            .from('quiz_questions')
            .update(updateData)
            .eq('id', question_id)
            .eq('quiz_id', id)
            .select()
            .single()

        if (error) throw error

        return NextResponse.json(data)
    } catch (error) {
        console.error('Error updating quiz question:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}

// DELETE all questions (for replacing)
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

        const { error } = await supabase
            .from('quiz_questions')
            .delete()
            .eq('quiz_id', id)

        if (error) throw error

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error deleting questions:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}
