import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { validateSession } from '@/lib/auth'

// GET all exams
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
            .from('exams')
            .select(`
                *,
                teaching_assignment:teaching_assignments(
                    id,
                    teacher:teachers(id, user:users(full_name)),
                    subject:subjects(name),
                    class:classes(id, name, school_level, grade_level)
                ),
                exam_questions(id)
            `)
            .order('created_at', { ascending: false })

        if (teachingAssignmentId) {
            query = query.eq('teaching_assignment_id', teachingAssignmentId)
        }

        const { data, error } = await query

        if (error) throw error

        // Add question count
        const examsWithCount = data?.map(exam => ({
            ...exam,
            question_count: exam.exam_questions?.length || 0,
            exam_questions: undefined
        }))

        return NextResponse.json(examsWithCount)
    } catch (error) {
        console.error('Error fetching exams:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}

// POST create new exam
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
        const { teaching_assignment_id, title, description, start_time, duration_minutes, is_randomized, max_violations } = body

        if (!teaching_assignment_id || !title || !start_time || !duration_minutes) {
            return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 })
        }

        const { data, error } = await supabase
            .from('exams')
            .insert({
                teaching_assignment_id,
                title,
                description,
                start_time,
                duration_minutes,
                is_randomized: is_randomized ?? true,
                max_violations: max_violations ?? 3
            })
            .select()
            .single()

        if (error) throw error

        return NextResponse.json(data)
    } catch (error) {
        console.error('Error creating exam:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}
