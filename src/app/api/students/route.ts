import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { validateSession, hashPassword } from '@/lib/auth'
import { parsePagination, applyPagination, paginationHeaders } from '@/lib/pagination'

// GET all students
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

        const { searchParams } = new URL(request.url)
        const class_id = searchParams.get('class_id')
        const angkatan = searchParams.get('angkatan')
        const school_level = searchParams.get('school_level')
        const status = searchParams.get('status')

        let query = supabase
            .from('students')
            .select(`
        id, user_id, nis, class_id, angkatan, school_level, status, created_at,
        user:users(id, username, full_name, role),
        class:classes(id, name, grade_level, school_level)
      `)
            .order('created_at', { ascending: false })

        // Apply filters
        if (class_id) {
            query = query.eq('class_id', class_id)
        }
        if (angkatan) {
            query = query.eq('angkatan', angkatan)
        }
        if (school_level) {
            query = query.eq('school_level', school_level)
        }
        if (status) {
            query = query.eq('status', status)
        }

        // P1: Apply optional pagination
        const pagination = parsePagination(request)
        if (pagination) {
            query = applyPagination(query, pagination)
        }

        const { data, error } = await query

        if (error) throw error

        const response = NextResponse.json(data || [])
        if (pagination) {
            Object.entries(paginationHeaders(pagination)).forEach(([k, v]) => response.headers.set(k, v))
        }
        return response
    } catch (error) {
        console.error('Error fetching students:', error)
        return NextResponse.json([])
    }
}

// POST new student
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

        const { username, password, full_name, nis, class_id, gender, angkatan, entry_year, school_level } = await request.json()

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
                role: 'SISWA'
            })
            .select()
            .single()

        if (userError) throw userError

        // Create student record
        const { data: student, error: studentError } = await supabase
            .from('students')
            .insert({
                user_id: newUser.id,
                nis,
                class_id: class_id || null,
                gender,
                angkatan: angkatan || null,
                entry_year: entry_year || null,
                school_level: school_level || null,
                status: 'ACTIVE'
            })
            .select(`
        *,
        user:users(id, username, full_name, role),
        class:classes(id, name)
      `)
            .single()

        if (studentError) {
            // Rollback user creation
            await supabase.from('users').delete().eq('id', newUser.id)
            throw studentError
        }

        return NextResponse.json(student)
    } catch (error) {
        console.error('Error creating student:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}
