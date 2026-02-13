import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { validateSession } from '@/lib/auth'

// GET subjects (filtered by teacher assignments for GURU role)
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

        // If user is a teacher, only return their assigned subjects
        if (user.role === 'GURU') {
            // Get teacher record
            const { data: teacher } = await supabase
                .from('teachers')
                .select('id')
                .eq('user_id', user.id)
                .single()

            if (teacher) {
                // Get unique subjects from teaching assignments
                const { data: assignments, error } = await supabase
                    .from('teaching_assignments')
                    .select('subject:subjects(id, name)')
                    .eq('teacher_id', teacher.id)

                if (error) throw error

                // Deduplicate subjects
                const subjectMap = new Map<string, { id: string; name: string }>()
                assignments?.forEach((a: { subject: { id: string; name: string } | null }) => {
                    if (a.subject) subjectMap.set(a.subject.id, a.subject)
                })

                const subjects = Array.from(subjectMap.values()).sort((a, b) => a.name.localeCompare(b.name))
                return NextResponse.json(subjects)
            }

            // Teacher not found — return empty
            return NextResponse.json([])
        }

        // Admin or other roles: return all subjects
        const { data, error } = await supabase
            .from('subjects')
            .select('*')
            .order('name')

        if (error) throw error

        return NextResponse.json(data)
    } catch (error) {
        console.error('Error fetching subjects:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}

// POST new subject
export async function POST(request: NextRequest) {
    try {
        const token = request.cookies.get('session_token')?.value
        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const user = await validateSession(token)
        if (!user || user.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { name } = await request.json()

        if (!name) {
            return NextResponse.json({ error: 'Nama mata pelajaran harus diisi' }, { status: 400 })
        }

        const { data, error } = await supabase
            .from('subjects')
            .insert({ name })
            .select()
            .single()

        if (error) throw error

        return NextResponse.json(data)
    } catch (error) {
        console.error('Error creating subject:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}
