import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { validateSession } from '@/lib/auth'

/**
 * GET /api/students/:id/enrollments
 * Fetch enrollment history for a student
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params

        // Verify authentication
        const token = request.cookies.get('session_token')?.value
        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const session = await validateSession(token)
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Fetch enrollment history with related data
        const { data: enrollments, error } = await supabase
            .from('student_enrollments')
            .select(`
                *,
                class:classes(id, name, grade_level, school_level),
                academic_year:academic_years(id, name, is_active)
            `)
            .eq('student_id', id)
            .order('enrolled_at', { ascending: false })

        if (error) {
            return NextResponse.json({
                error: 'Failed to fetch enrollments',
                details: error.message
            }, { status: 500 })
        }

        return NextResponse.json({ enrollments: enrollments || [] })

    } catch (error: any) {
        console.error('Error fetching enrollments:', error)
        return NextResponse.json({
            error: 'Internal server error',
            details: error.message
        }, { status: 500 })
    }
}
