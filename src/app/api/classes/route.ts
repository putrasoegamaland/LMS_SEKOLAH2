import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { validateSession } from '@/lib/auth'

// GET all classes
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

        // Get optional filter parameters
        const url = new URL(request.url)
        const grade_level = url.searchParams.get('grade_level')
        const academic_year_id = url.searchParams.get('academic_year_id')

        let query = supabase
            .from('classes')
            .select(`
        *,
        academic_year:academic_years(*),
        homeroom_teacher:teachers!homeroom_teacher_id(
          id,
          nip,
          user:users(id, full_name, username)
        )
      `)

        // Apply filters if specified
        if (grade_level) {
            query = query.eq('grade_level', parseInt(grade_level))
        }
        if (academic_year_id) {
            query = query.eq('academic_year_id', academic_year_id)
        }

        // Order by grade_level first (nulls last), then name
        const { data, error } = await query
            .order('grade_level', { ascending: true, nullsFirst: false })
            .order('name', { ascending: true })

        if (error) throw error

        return NextResponse.json(data)
    } catch (error) {
        console.error('Error fetching classes:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}

// POST new class
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

        const { name, academic_year_id, grade_level, school_level } = await request.json()

        if (!name || !academic_year_id) {
            return NextResponse.json({ error: 'Nama kelas dan tahun ajaran harus diisi' }, { status: 400 })
        }

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
            .insert({ name, academic_year_id, grade_level, school_level })
            .select()
            .single()

        if (error) throw error

        return NextResponse.json(data)
    } catch (error) {
        console.error('Error creating class:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}
