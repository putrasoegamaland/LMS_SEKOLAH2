import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/supabase'
import { validateSession } from '@/lib/auth'

// GET all teaching assignments
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

        const academicYearId = request.nextUrl.searchParams.get('academic_year_id')
        const allYears = request.nextUrl.searchParams.get('all_years')

        // Auto-filter by active year if no specific year requested
        let filterYearId = academicYearId
        if (!filterYearId && allYears !== 'true') {
            const { data: activeYear } = await supabase
                .from('academic_years')
                .select('id')
                .eq('is_active', true)
                .single()
            if (activeYear) filterYearId = activeYear.id
        }

        let query = supabase
            .from('teaching_assignments')
            .select(`
        *,
        teacher:teachers(
          id,
          nip,
          user:users(id, username, full_name)
        ),
        subject:subjects(*),
        class:classes(*),
        academic_year:academic_years(*)
      `)
            .order('created_at', { ascending: false })

        if (filterYearId) {
            query = query.eq('academic_year_id', filterYearId)
        }

        const { data, error } = await query

        if (error) throw error

        return NextResponse.json(data)
    } catch (error) {
        console.error('Error fetching teaching assignments:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}

// POST new teaching assignment
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

        const { teacher_id, subject_id, class_id, academic_year_id } = await request.json()

        if (!teacher_id || !subject_id || !class_id || !academic_year_id) {
            return NextResponse.json({ error: 'Semua field harus diisi' }, { status: 400 })
        }

        // Check for duplicate
        const { data: existing } = await supabase
            .from('teaching_assignments')
            .select('id')
            .eq('teacher_id', teacher_id)
            .eq('subject_id', subject_id)
            .eq('class_id', class_id)
            .eq('academic_year_id', academic_year_id)
            .single()

        if (existing) {
            return NextResponse.json({ error: 'Penugasan sudah ada' }, { status: 400 })
        }

        const { data, error } = await supabase
            .from('teaching_assignments')
            .insert({ teacher_id, subject_id, class_id, academic_year_id })
            .select(`
        *,
        teacher:teachers(
          id,
          nip,
          user:users(id, username, full_name)
        ),
        subject:subjects(*),
        class:classes(*),
        academic_year:academic_years(*)
      `)
            .single()

        if (error) throw error

        return NextResponse.json(data)
    } catch (error) {
        console.error('Error creating teaching assignment:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}
