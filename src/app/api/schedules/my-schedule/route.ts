import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { validateSession } from '@/lib/auth'

// GET my schedule (for teachers — returns today's schedule or full week)
export async function GET(request: NextRequest) {
    try {
        const token = request.cookies.get('session_token')?.value
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const user = await validateSession(token)
        if (!user || user.role !== 'GURU') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const todayOnly = request.nextUrl.searchParams.get('today') === 'true'

        // Get teacher record
        const { data: teacher } = await supabase
            .from('teachers')
            .select('id')
            .eq('user_id', user.id)
            .single()

        if (!teacher) {
            return NextResponse.json([])
        }

        // Get active academic year
        const { data: activeYear } = await supabase
            .from('academic_years')
            .select('id')
            .eq('is_active', true)
            .single()

        if (!activeYear) {
            return NextResponse.json([])
        }

        const today = new Date().toISOString().split('T')[0]

        // Find all active schedules that have entries for this teacher
        // for classes in the current academic year
        const { data: entries, error } = await supabase
            .from('schedule_entries')
            .select(`
                *,
                subject:subjects(id, name),
                teacher:teachers(id, user:users(full_name)),
                schedule:schedules!inner(
                    id,
                    effective_from,
                    is_active,
                    academic_year_id,
                    class:classes(id, name, grade_level)
                )
            `)
            .eq('teacher_id', teacher.id)
            .eq('schedule.is_active', true)
            .eq('schedule.academic_year_id', activeYear.id)
            .lte('schedule.effective_from', today)
            .order('day_of_week', { ascending: true })
            .order('period', { ascending: true })

        if (error) throw error

        let result = entries || []

        // Filter to today only if requested
        if (todayOnly) {
            // JavaScript: 0=Sunday, 1=Monday, ... 6=Saturday
            // Our DB: 1=Monday, 2=Tuesday, ... 6=Saturday, 7=Sunday
            const jsDay = new Date().getDay()
            const dbDay = jsDay === 0 ? 7 : jsDay
            result = result.filter((e: any) => e.day_of_week === dbDay)
        }

        return NextResponse.json(result)
    } catch (error) {
        console.error('Error fetching my schedule:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}
