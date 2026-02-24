import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { validateSession } from '@/lib/auth'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
    try {
        const token = request.cookies.get('session_token')?.value
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const user = await validateSession(token)
        if (!user || user.role !== 'SISWA') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Get student's class
        const { data: student, error: studentError } = await supabase
            .from('students')
            .select('class_id')
            .eq('user_id', user.id)
            .single()

        if (studentError || !student?.class_id) {
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

        // Find schedule for student's class
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
                    class_id
                )
            `)
            .eq('schedule.is_active', true)
            .eq('schedule.academic_year_id', activeYear.id)
            .eq('schedule.class_id', student.class_id)
            .lte('schedule.effective_from', today)
            .order('day_of_week', { ascending: true })
            .order('period', { ascending: true })

        if (error) throw error

        let result = entries || []

        // JavaScript: 0=Sunday, 1=Monday, ... 6=Saturday
        // Our DB: 1=Monday, 2=Tuesday, ... 6=Saturday, 7=Sunday
        const jsDay = new Date().getDay()
        const dbDay = jsDay === 0 ? 7 : jsDay
        result = result.filter((e: any) => e.day_of_week === dbDay)

        return NextResponse.json(result)
    } catch (error) {
        console.error('Error fetching student schedule:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}
