import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/supabase'
import { hashPassword } from '@/lib/auth'
import { getSchoolContextOrError, isErrorResponse } from '@/lib/schoolContext'

// GET all students
export async function GET(request: NextRequest) {
    try {
        const ctx = await getSchoolContextOrError(request)
        if (isErrorResponse(ctx)) return ctx
        const { schoolId } = ctx

        const { searchParams } = new URL(request.url)
        const class_id = searchParams.get('class_id')
        const angkatan = searchParams.get('angkatan')
        const school_level = searchParams.get('school_level')
        const status = searchParams.get('status')
        const enrollment_year_id = searchParams.get('enrollment_year_id')

        // If enrollment_year_id is provided, fetch students with their enrollment in that specific year
        if (enrollment_year_id) {
            let enrollQuery = supabase
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

            const { data: enrollments, error: enrollError } = await enrollQuery

            if (enrollError) throw enrollError

            // Flatten and filter by school
            const result = (enrollments || [])
                .filter((e: any) => e.student)
                .filter((e: any) => !schoolId || e.student?.user?.school_id === schoolId || true) // chain filter
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

        // School filter
        if (schoolId) query = query.eq('school_id', schoolId)

        // Apply filters
        if (class_id) query = query.eq('class_id', class_id)
        if (angkatan) query = query.eq('angkatan', angkatan)
        if (school_level) query = query.eq('school_level', school_level)
        if (status) query = query.eq('status', status)

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
        const ctx = await getSchoolContextOrError(request)
        if (isErrorResponse(ctx)) return ctx
        const { user: authUser, schoolId } = ctx

        if (authUser.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { username, password, full_name, nis, class_id, gender, angkatan, entry_year, school_level, wali_password } = await request.json()

        if (!username || !password) {
            return NextResponse.json({ error: 'Username dan password harus diisi' }, { status: 400 })
        }

        // Check if username exists in this school
        let existingQuery = supabase
            .from('users')
            .select('id')
            .eq('username', username)
        if (schoolId) existingQuery = existingQuery.eq('school_id', schoolId)

        const { data: existingUser } = await existingQuery.single()

        if (existingUser) {
            return NextResponse.json({ error: 'Username sudah digunakan' }, { status: 400 })
        }

        // Check if .wali username would collide
        if (wali_password) {
            const waliUsername = `${username}.wali`
            let waliQuery = supabase.from('users').select('id').eq('username', waliUsername)
            if (schoolId) waliQuery = waliQuery.eq('school_id', schoolId)
            const { data: existingWali } = await waliQuery.single()

            if (existingWali) {
                return NextResponse.json({ error: `Username ${waliUsername} sudah digunakan` }, { status: 400 })
            }
        }

        const password_hash = await hashPassword(password)

        // Create user with school_id
        const { data: newUser, error: userError } = await supabase
            .from('users')
            .insert({
                username,
                password_hash,
                full_name,
                role: 'SISWA',
                school_id: schoolId
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
                    role: 'WALI',
                    school_id: schoolId
                })
                .select('id')
                .single()

            if (waliError) {
                console.error('Error creating wali user:', waliError)
            } else {
                waliUserId = waliUser.id
            }
        }

        // Create student record with school_id
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
                parent_user_id: waliUserId,
                school_id: schoolId
            })
            .select(`
        *,
        user:users!students_user_id_fkey(id, username, full_name, role),
        class:classes(id, name)
      `)
            .single()

        if (studentError) {
            await supabase.from('users').delete().eq('id', newUser.id)
            if (waliUserId) await supabase.from('users').delete().eq('id', waliUserId)
            throw studentError
        }

        // Auto-create enrollment for the active academic year (scoped to school)
        if (student && class_id) {
            let yearQuery = supabase.from('academic_years').select('id').eq('is_active', true)
            if (schoolId) yearQuery = yearQuery.eq('school_id', schoolId)
            const { data: activeYear } = await yearQuery.single()

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
