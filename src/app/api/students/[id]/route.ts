import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/supabase'
import { validateSession, hashPassword } from '@/lib/auth'

// GET student by ID
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

        const { data: student, error } = await supabase
            .from('students')
            .select(`
                *,
                user:users(id, username, full_name),
                class:classes(id, name, school_level)
            `)
            .eq('id', id)
            .single()

        if (error || !student) {
            return NextResponse.json({ error: 'Siswa tidak ditemukan' }, { status: 404 })
        }

        return NextResponse.json(student)
    } catch (error) {
        console.error('Error fetching student:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}
// PUT update student
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

        const { username, password, full_name, nis, class_id, gender, angkatan, entry_year, school_level, status } = await request.json()

        // Get student to find user_id
        const { data: student } = await supabase
            .from('students')
            .select('user_id')
            .eq('id', id)
            .single()

        if (!student) {
            return NextResponse.json({ error: 'Siswa tidak ditemukan' }, { status: 404 })
        }

        // Update user
        const userUpdate: Record<string, string> = {}
        if (username) userUpdate.username = username
        if (full_name) userUpdate.full_name = full_name
        if (password) userUpdate.password_hash = await hashPassword(password)

        if (Object.keys(userUpdate).length > 0) {
            const { error: userError } = await supabase
                .from('users')
                .update(userUpdate)
                .eq('id', student.user_id)

            if (userError) throw userError
        }

        // Update student
        const studentUpdate: Record<string, string | number | null> = {}
        if (nis !== undefined) studentUpdate.nis = nis
        if (class_id !== undefined) studentUpdate.class_id = class_id
        if (gender !== undefined) studentUpdate.gender = gender
        if (angkatan !== undefined) studentUpdate.angkatan = angkatan
        if (entry_year !== undefined) studentUpdate.entry_year = entry_year
        if (school_level !== undefined) studentUpdate.school_level = school_level
        if (status !== undefined) studentUpdate.status = status

        if (Object.keys(studentUpdate).length > 0) {
            const { error: studentError } = await supabase
                .from('students')
                .update(studentUpdate)
                .eq('id', id)

            if (studentError) throw studentError
        }

        // Fetch updated data
        const { data: updatedStudent, error } = await supabase
            .from('students')
            .select(`
        *,
        user:users(id, username, full_name, role),
        class:classes(id, name)
      `)
            .eq('id', id)
            .single()

        if (error) throw error

        return NextResponse.json(updatedStudent)
    } catch (error) {
        console.error('Error updating student:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}

// DELETE student
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

        // Get student to find user_id
        const { data: student } = await supabase
            .from('students')
            .select('user_id')
            .eq('id', id)
            .single()

        if (!student) {
            return NextResponse.json({ error: 'Siswa tidak ditemukan' }, { status: 404 })
        }

        // Delete user (will cascade to student)
        const { error } = await supabase
            .from('users')
            .delete()
            .eq('id', student.user_id)

        if (error) throw error

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error deleting student:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}
