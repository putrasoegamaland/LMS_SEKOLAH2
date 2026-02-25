import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/supabase'

/**
 * GET /api/student-enrollments
 * Fetch student enrollments with class info
 * Params: student_id (required)
 */
export async function GET(request: NextRequest) {
    try {
        const studentId = request.nextUrl.searchParams.get('student_id')

        if (!studentId) {
            return NextResponse.json({ error: 'student_id is required' }, { status: 400 })
        }

        const { data, error } = await supabase
            .from('student_enrollments')
            .select(`
                id,
                student_id,
                class_id,
                academic_year_id,
                status,
                notes,
                created_at,
                ended_at,
                class:classes(id, name, grade_level),
                academic_year:academic_years(id, name, is_active)
            `)
            .eq('student_id', studentId)
            .order('created_at', { ascending: false })

        if (error) {
            console.error('Error fetching enrollments:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json(data || [])
    } catch (error: any) {
        console.error('Error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
