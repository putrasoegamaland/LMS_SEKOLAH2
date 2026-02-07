import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { validateSession } from '@/lib/auth'

// PUT update class
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
        if (!user || user.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { name, academic_year_id, grade_level, school_level } = await request.json()

        // Validate grade_level if provided
        if (grade_level !== null && grade_level !== undefined) {
            if (![1, 2, 3].includes(grade_level)) {
                return NextResponse.json({ error: 'Tingkat kelas harus 1, 2, atau 3' }, { status: 400 })
            }
        }

        // Validate school_level if provided
        if (school_level !== null && school_level !== undefined) {
            if (!['SMP', 'SMA'].includes(school_level)) {
                return NextResponse.json({ error: 'Jenjang sekolah harus SMP atau SMA' }, { status: 400 })
            }
        }

        const { data, error } = await supabase
            .from('classes')
            .update({ name, academic_year_id, grade_level, school_level })
            .eq('id', id)
            .select()
            .single()

        if (error) throw error

        return NextResponse.json(data)
    } catch (error) {
        console.error('Error updating class:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}

// DELETE class
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
        if (!user || user.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { error } = await supabase
            .from('classes')
            .delete()
            .eq('id', id)

        if (error) throw error

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error deleting class:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}
