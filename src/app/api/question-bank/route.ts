import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { validateSession } from '@/lib/auth'

// GET question bank
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

        const subjectId = request.nextUrl.searchParams.get('subject_id')
        const search = request.nextUrl.searchParams.get('search')

        // Get teacher
        const { data: teacher } = await supabase
            .from('teachers')
            .select('id')
            .eq('user_id', user.id)
            .single()

        if (!teacher) {
            return NextResponse.json({ error: 'Teacher not found' }, { status: 404 })
        }

        let query = supabase
            .from('question_bank')
            .select(`
                *,
                subject:subjects(id, name),
                teacher:teachers(id, user:users(full_name))
            `)
            .eq('teacher_id', teacher.id)
            .order('created_at', { ascending: false })

        if (subjectId) {
            query = query.eq('subject_id', subjectId)
        }

        if (search) {
            query = query.ilike('question_text', `%${search}%`)
        }

        const { data, error } = await query

        if (error) throw error

        return NextResponse.json(data)
    } catch (error) {
        console.error('Error fetching question bank:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}

// PUT update question in bank
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

        const body = await request.json()
        const { id, question_text, question_type, options, correct_answer, difficulty, subject_id } = body

        if (!id) {
            return NextResponse.json({ error: 'ID diperlukan' }, { status: 400 })
        }

        const updateData: any = {}
        if (question_text !== undefined) updateData.question_text = question_text
        if (question_type !== undefined) updateData.question_type = question_type
        if (options !== undefined) updateData.options = options
        if (correct_answer !== undefined) updateData.correct_answer = correct_answer
        if (difficulty !== undefined) updateData.difficulty = difficulty
        if (subject_id !== undefined) updateData.subject_id = subject_id

        const { data, error } = await supabase
            .from('question_bank')
            .update(updateData)
            .eq('id', id)
            .select(`
                *,
                subject:subjects(id, name),
                teacher:teachers(id, user:users(full_name))
            `)
            .single()

        if (error) throw error

        return NextResponse.json(data)
    } catch (error) {
        console.error('Error updating question bank:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}

// POST add to question bank
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

        // Get teacher
        const { data: teacher } = await supabase
            .from('teachers')
            .select('id')
            .eq('user_id', user.id)
            .single()

        if (!teacher) {
            return NextResponse.json({ error: 'Teacher not found' }, { status: 404 })
        }

        const body = await request.json()

        // Handle bulk insert
        if (Array.isArray(body)) {
            const questions = body.map((q: any) => ({
                teacher_id: teacher.id,
                subject_id: q.subject_id || null,
                question_text: q.question_text,
                question_type: q.question_type,
                options: q.options || null,
                correct_answer: q.correct_answer || null,
                difficulty: q.difficulty || 'MEDIUM',
                tags: q.tags || null
            }))

            const { data, error } = await supabase
                .from('question_bank')
                .insert(questions)
                .select()

            if (error) throw error

            return NextResponse.json(data)
        }

        // Single insert
        const { subject_id, question_text, question_type, options, correct_answer, difficulty, tags } = body

        const { data, error } = await supabase
            .from('question_bank')
            .insert({
                teacher_id: teacher.id,
                subject_id: subject_id || null,
                question_text,
                question_type,
                options: options || null,
                correct_answer: correct_answer || null,
                difficulty: difficulty || 'MEDIUM',
                tags: tags || null
            })
            .select()
            .single()

        if (error) throw error

        return NextResponse.json(data)
    } catch (error) {
        console.error('Error adding to question bank:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}

// DELETE from question bank
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

        const id = request.nextUrl.searchParams.get('id')
        if (!id) {
            return NextResponse.json({ error: 'ID diperlukan' }, { status: 400 })
        }

        const { error } = await supabase
            .from('question_bank')
            .delete()
            .eq('id', id)

        if (error) throw error

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error deleting from question bank:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}
