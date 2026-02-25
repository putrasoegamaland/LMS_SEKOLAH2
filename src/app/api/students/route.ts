import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/supabase'
import { validateSession, hashPassword } from '@/lib/auth'

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
        const enrollment_year_id = searchParams.get('enrollment_year_id')

        // If enrollment_year_id is provided, fetch students with their enrollment in that specific year
        if (enrollment_year_id) {
            const { data: enrollments, error: enrollError } = await supabase
                .from('student_enrollments')
                .select(`
                    id,
                    status,
                    class_id,
                    academic_year_id,
                    ended_at,
                    notes,
                    created_at,
                    student:students!student_enrollments_student_id_fkey(
                        id,
                        nis,
                        class_id,
                        angkatan,
                        school_level,
                        status,
                        gender,
                        user:users!students_user_id_fkey(id, username, full_name, role),
                        class:classes(id, name, grade_level, school_level, academic_year_id)
                    ),
                    enrollment_class:classes!student_enrollments_class_id_fkey(id, name, grade_level, school_level, academic_year_id)
                `)
                .eq('academic_year_id', enrollment_year_id)
                .order('created_at', { ascending: false })

            if (enrollError) throw enrollError

            // Flatten: merge student data with enrollment info
            const result = (enrollments || [])
                .filter((e: any) => e.student)
                .map((e: any) => ({
                    ...e.student,
                    class: e.enrollment_class || e.student.class,
                    enrollment_status: e.status,
                    enrollment_id: e.id,
                    enrollment_ended_at: e.ended_at,
                    enrollment_notes: e.notes
                }))

            return NextResponse.json(result)
        }

        let query = supabase
            .from('students')
            .select(`
        *,
        user:users!students_user_id_fkey(id, username, full_name, role),
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

        const { data, error } = await query

        if (error) throw error

        return NextResponse.json(data || [])
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

        const { username, password, full_name, nis, class_id, gender, angkatan, entry_year, school_level, wali_password } = await request.json()

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

        // Check if .wali username would collide
        if (wali_password) {
            const waliUsername = `${username}.wali`
            const { data: existingWali } = await supabase
                .from('users')
                .select('id')
                .eq('username', waliUsername)
                .single()

            if (existingWali) {
                return NextResponse.json({ error: `Username ${waliUsername} sudah digunakan` }, { status: 400 })
            }
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

        // Auto-create .wali user if wali_password is provided
        let waliUserId: string | null = null
        if (wali_password) {
            const wali_hash = await hashPassword(wali_password)
            const { data: waliUser, error: waliError } = await supabase
                .from('users')
                .insert({
                    username: `${username}.wali`,
                    password_hash: wali_hash,
                    full_name: `Orang Tua - ${full_name || username}`,
                    role: 'WALI'
                })
                .select('id')
                .single()

            if (waliError) {
                console.error('Error creating wali user:', waliError)
                // Don't fail student creation, just skip wali
            } else {
                waliUserId = waliUser.id
            }
        }

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
                status: 'ACTIVE',
                parent_user_id: waliUserId
            })
            .select(`
        *,
        user:users!students_user_id_fkey(id, username, full_name, role),
        class:classes(id, name)
      `)
            .single()

        if (studentError) {
            // Rollback user creation
            await supabase.from('users').delete().eq('id', newUser.id)
            if (waliUserId) await supabase.from('users').delete().eq('id', waliUserId)
            throw studentError
        }

        // Auto-create enrollment for the active academic year
        if (student && class_id) {
            const { data: activeYear } = await supabase
                .from('academic_years')
                .select('id')
                .eq('is_active', true)
                .single()

            if (activeYear) {
                await supabase
                    .from('student_enrollments')
                    .insert({
                        student_id: student.id,
                        class_id: class_id,
                        academic_year_id: activeYear.id,
                        status: 'ACTIVE'
                    })
            }
        }

        return NextResponse.json(student)
    } catch (error) {
        console.error('Error creating student:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}
