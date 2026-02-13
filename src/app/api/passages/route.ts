import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { validateSession } from '@/lib/auth'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET - List passages for teacher
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

        // Get teacher
        const { data: teacher } = await supabase
            .from('teachers')
            .select('id')
            .eq('user_id', user.id)
            .single()

        if (!teacher) {
            return NextResponse.json({ error: 'Teacher not found' }, { status: 404 })
        }

        const { searchParams } = new URL(request.url)
        const subjectId = searchParams.get('subject_id')

        let query = supabase
            .from('question_passages')
            .select(`
                *,
                subject:subjects(id, name),
                questions:question_bank(id, question_text, question_type, options, correct_answer, difficulty, order_in_passage)
            `)
            .eq('teacher_id', teacher.id)
            .order('created_at', { ascending: false })

        if (subjectId) {
            query = query.eq('subject_id', subjectId)
        }

        const { data, error } = await query

        if (error) throw error

        // Sort questions by order_in_passage
        const result = data?.map(p => ({
            ...p,
            questions: p.questions?.sort((a: any, b: any) =>
                (a.order_in_passage || 0) - (b.order_in_passage || 0)
            )
        }))

        return NextResponse.json(result || [])
    } catch (error) {
        console.error('Error fetching passages:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}

// POST - Create passage with questions
export async function POST(request: NextRequest) {
    try {
        const token = request.cookies.get('session_token')?.value
        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const user = await validateSession(token)
        if (!user || user.role !== 'GURU') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { data: teacher } = await supabase
            .from('teachers')
            .select('id')
            .eq('user_id', user.id)
            .single()

        if (!teacher) {
            return NextResponse.json({ error: 'Teacher not found' }, { status: 404 })
        }

        const { title, passage_text, subject_id, questions } = await request.json()

        if (!passage_text) {
            return NextResponse.json({ error: 'Passage text required' }, { status: 400 })
        }

        if (!questions || questions.length === 0) {
            return NextResponse.json({ error: 'At least one question required' }, { status: 400 })
        }

        // Create passage
        const { data: passage, error: passageError } = await supabase
            .from('question_passages')
            .insert({
                title,
                passage_text,
                subject_id: subject_id || null,
                teacher_id: teacher.id
            })
            .select()
            .single()

        if (passageError) throw passageError

        // Create questions linked to passage
        const questionsToInsert = questions.map((q: any, idx: number) => ({
            question_text: q.question_text,
            question_type: q.question_type,
            options: q.options,
            correct_answer: q.correct_answer,
            difficulty: q.difficulty || 'MEDIUM',
            subject_id: subject_id || null,
            teacher_id: teacher.id,
            passage_id: passage.id,
            order_in_passage: idx + 1
        }))

        const { error: questionsError } = await supabase
            .from('question_bank')
            .insert(questionsToInsert)

        if (questionsError) throw questionsError

        // Return created passage with questions
        const { data: result } = await supabase
            .from('question_passages')
            .select(`
                *,
                subject:subjects(id, name),
                questions:question_bank(id, question_text, question_type, difficulty, order_in_passage)
            `)
            .eq('id', passage.id)
            .single()

        return NextResponse.json(result)
    } catch (error) {
        console.error('Error creating passage:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}

// PUT - Update passage
export async function PUT(request: NextRequest) {
    try {
        const token = request.cookies.get('session_token')?.value
        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const user = await validateSession(token)
        if (!user || user.role !== 'GURU') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { data: teacher } = await supabase
            .from('teachers')
            .select('id')
            .eq('user_id', user.id)
            .single()

        if (!teacher) {
            return NextResponse.json({ error: 'Teacher not found' }, { status: 404 })
        }

        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')
        const { title, passage_text, subject_id, questions } = await request.json()

        if (!id) {
            return NextResponse.json({ error: 'Passage ID required' }, { status: 400 })
        }

        // Update passage info
        const { data: passage, error: passageError } = await supabase
            .from('question_passages')
            .update({
                title,
                passage_text,
                subject_id: subject_id || null,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single()

        if (passageError) throw passageError

        // If questions provided, replace all questions
        if (questions && questions.length > 0) {
            // Delete old questions
            await supabase
                .from('question_bank')
                .delete()
                .eq('passage_id', id)

            // Insert new questions
            const questionsToInsert = questions.map((q: any, idx: number) => ({
                question_text: q.question_text,
                question_type: q.question_type,
                options: q.options,
                correct_answer: q.correct_answer,
                difficulty: q.difficulty || 'MEDIUM',
                subject_id: subject_id || null,
                teacher_id: teacher.id,
                passage_id: id,
                order_in_passage: idx + 1
            }))

            const { error: questionsError } = await supabase
                .from('question_bank')
                .insert(questionsToInsert)

            if (questionsError) throw questionsError
        }

        // Return updated passage with questions
        const { data: result } = await supabase
            .from('question_passages')
            .select(`
                *,
                subject:subjects(id, name),
                questions:question_bank(id, question_text, question_type, options, correct_answer, difficulty, order_in_passage)
            `)
            .eq('id', id)
            .single()

        return NextResponse.json(result)
    } catch (error) {
        console.error('Error updating passage:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}

// DELETE - Delete passage and its questions
export async function DELETE(request: NextRequest) {
    try {
        const token = request.cookies.get('session_token')?.value
        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const user = await validateSession(token)
        if (!user || user.role !== 'GURU') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')

        if (!id) {
            return NextResponse.json({ error: 'Passage ID required' }, { status: 400 })
        }

        // Delete questions first (or they'll be orphaned if ON DELETE SET NULL)
        await supabase
            .from('question_bank')
            .delete()
            .eq('passage_id', id)

        // Delete passage
        const { error } = await supabase
            .from('question_passages')
            .delete()
            .eq('id', id)

        if (error) throw error

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error deleting passage:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}
