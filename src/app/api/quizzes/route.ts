import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { validateSession } from '@/lib/auth'

// GET all quizzes (filtered by teacher)
export async function GET(request: NextRequest) {
    try {
        const token = request.cookies.get('session_token')?.value
        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const user = await validateSession(token)
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const teachingAssignmentId = request.nextUrl.searchParams.get('teaching_assignment_id')

        let query = supabase
            .from('quizzes')
            .select(`
                *,
                teaching_assignment:teaching_assignments(
                    id,
                    subject:subjects(id, name),
                    class:classes(id, name, school_level, grade_level),
                    teacher:teachers(id, user:users(full_name))
                ),
                questions:quiz_questions(count)
            `)
            .order('created_at', { ascending: false })

        if (teachingAssignmentId) {
            query = query.eq('teaching_assignment_id', teachingAssignmentId)
        }

        const { data, error } = await query

        if (error) throw error

        return NextResponse.json(data)
    } catch (error) {
        console.error('Error fetching quizzes:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}

// POST create new quiz
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

        const body = await request.json()
        const { teaching_assignment_id, title, description, duration_minutes, is_randomized, questions } = body

        if (!teaching_assignment_id || !title) {
            return NextResponse.json({ error: 'Teaching assignment dan judul diperlukan' }, { status: 400 })
        }

        // Create quiz (default: draft/inactive until published)
        const { data: quiz, error: quizError } = await supabase
            .from('quizzes')
            .insert({
                teaching_assignment_id,
                title,
                description,
                duration_minutes: duration_minutes || 30,
                is_randomized: is_randomized ?? true,
                is_active: false  // Draft by default
            })
            .select()
            .single()

        if (quizError) throw quizError

        // Add questions if provided
        if (questions && questions.length > 0) {
            const questionsWithQuizId = questions.map((q: any, idx: number) => ({
                quiz_id: quiz.id,
                question_text: q.question_text,
                question_type: q.question_type,
                options: q.options || null,
                correct_answer: q.correct_answer || null,
                points: q.points || 10,
                order_index: idx
            }))

            const { error: questionsError } = await supabase
                .from('quiz_questions')
                .insert(questionsWithQuizId)

            if (questionsError) throw questionsError
        }

        return NextResponse.json(quiz)
    } catch (error) {
        console.error('Error creating quiz:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}
