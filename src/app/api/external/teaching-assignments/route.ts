import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
    try {
        // Security Check
        const apiKey = request.headers.get('x-api-key')
        if (apiKey !== process.env.EXTERNAL_API_SECRET) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const limit = parseInt(request.nextUrl.searchParams.get('limit') || '100')
        const offset = parseInt(request.nextUrl.searchParams.get('offset') || '0')
        const academicYearId = request.nextUrl.searchParams.get('academic_year_id')

        let query = supabase
            .from('teaching_assignments')
            .select(`
                id,
                teacher_id,
                subject_id,
                class_id,
                academic_year_id,
                created_at,
                teacher:teachers(id, user:users(full_name)),
                subject:subjects(id, name),
                class:classes(id, name, school_level),
                academic_year:academic_years(id, name, status)
            `, { count: 'exact' })
            .range(offset, offset + limit - 1)

        if (academicYearId) {
            query = query.eq('academic_year_id', academicYearId)
        }

        const { data, error, count } = await query

        if (error) throw error

        const formattedAssignments = (data as any[]).map(ta => ({
            id: ta.id,
            teacher_name: ta.teacher?.user?.full_name,
            teacher_id: ta.teacher_id,
            subject: ta.subject?.name,
            subject_id: ta.subject_id,
            class_name: ta.class?.name,
            class_id: ta.class_id,
            school_level: ta.class?.school_level,
            academic_year: ta.academic_year?.name,
            created_at: ta.created_at
        }))

        return NextResponse.json({
            data: formattedAssignments,
            meta: {
                total: count,
                limit,
                offset
            }
        })
    } catch (error) {
        console.error('Error fetching teaching assignments:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}
