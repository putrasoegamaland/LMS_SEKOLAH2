import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/supabase'
import { validateSession, hashPassword } from '@/lib/auth'

// GET all teachers
export async function GET(request: NextRequest) {
    try {
        const token = request.cookies.get('session_token')?.value
        if (!token) {
            console.error('API Teachers: No session_token cookie found')
            return NextResponse.json({ error: 'Unauthorized: No token' }, { status: 401 })
        }

        const user = await validateSession(token)
        if (!user) {
            console.error('API Teachers: Session invalid or expired')
            return NextResponse.json({ error: 'Unauthorized: Invalid session' }, { status: 401 })
        }

        const { data, error } = await supabase
            .from('teachers')
            .select(`
        *,
        user:users(id, username, full_name, role)
      `)
            .order('created_at', { ascending: false })

        if (error) throw error

        return NextResponse.json(data)
    } catch (error: any) {
        console.error('Error fetching teachers (Detailed):', {
            message: error.message,
            stack: error.stack,
            details: error
        })
        return NextResponse.json({
            error: 'Server error',
            details: error.message
        }, { status: 500 })
    }
}

// POST new teacher (creates user + teacher record)
export async function POST(request: NextRequest) {
    try {
        const token = request.cookies.get('session_token')?.value
        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const authUser = await validateSession(token)
        if (!authUser || authUser.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { username, password, full_name, nip, gender } = await request.json()

        if (!username || !password) {
            return NextResponse.json({ error: 'Username dan password harus diisi' }, { status: 400 })
        }

        // Check if username exists
        const { data: existingUser } = await supabase
            .from('users')
            .select('id')
            .eq('username', username)
            .single()

        if (existingUser) {
            return NextResponse.json({ error: 'Username sudah digunakan' }, { status: 400 })
        }

        // Hash password
        const password_hash = await hashPassword(password)

        // Create user
        const { data: newUser, error: userError } = await supabase
            .from('users')
            .insert({
                username,
                password_hash,
                full_name,
                role: 'GURU'
            })
            .select()
            .single()

        if (userError) throw userError

        // Create teacher record
        const { data: teacher, error: teacherError } = await supabase
            .from('teachers')
            .insert({
                user_id: newUser.id,
                nip,
                gender
            })
            .select(`
        *,
        user:users(id, username, full_name, role)
      `)
            .single()

        if (teacherError) {
            // Rollback user creation
            await supabase.from('users').delete().eq('id', newUser.id)
            throw teacherError
        }

        return NextResponse.json(teacher)
    } catch (error) {
        console.error('Error creating teacher:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}
