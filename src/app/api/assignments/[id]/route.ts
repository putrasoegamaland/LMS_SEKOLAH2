import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/supabase'
import { validateSession } from '@/lib/auth'

// GET single assignment
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
            .from('assignments')
            .select(`
                *,
                teaching_assignment:teaching_assignments(
                    id,
                    class:classes(id, name),
                    subject:subjects(id, name),
                    teacher:teachers(id, user:users(full_name))
                )
            `)
            .eq('id', id)
            .single()

        if (error) throw error

        return NextResponse.json(data)
    } catch (error) {
        console.error('Error fetching assignment:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}

// DELETE assignment
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
            .from('assignments')
            .delete()
            .eq('id', id)

        if (error) throw error

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error deleting assignment:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}

// PUT (update) assignment
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

        const { title, description, type, due_date } = await request.json()

        if (!title || !type) {
            return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 })
        }

        const { data, error } = await supabase
            .from('assignments')
            .update({ title, description, type, due_date })
            .eq('id', id)
            .select()
            .single()

        if (error) throw error

        return NextResponse.json(data)
    } catch (error) {
        console.error('Error updating assignment:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}
