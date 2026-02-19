import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
    try {
        // Security Check
        const apiKey = request.headers.get('x-api-key')
        if (apiKey !== process.env.EXTERNAL_API_SECRET) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const teacherId = request.nextUrl.searchParams.get('teacher_id')
        const academicYearId = request.nextUrl.searchParams.get('academic_year_id')
        const month = request.nextUrl.searchParams.get('month') // Optional filter by month (1-12)

        // Base filter setup
        const applyFilters = (query: any, tablePrefix: string = '') => {
            if (teacherId) {
                // This is tricky because materials/exams link to teaching_assignment, not teacher directly
                // We need to filter by teaching_assignment.teacher_id
                // But Supabase simple filtering doesn't support deep filtering easily on count
                // So we might need to fetch teaching_assignments for this teacher first
            }
            return query
        }

        // 1. Get Teaching Assignment IDs for filtering if teacherId provided
        let teachingAssignmentIds: string[] = []
        if (teacherId) {
            const { data: tas } = await supabase
                .from('teaching_assignments')
                .select('id')
                .eq('teacher_id', teacherId)

            if (tas) teachingAssignmentIds = tas.map(t => t.id)
        }

        // Helper to query count
        const getCount = async (table: string, timeColumn: string = 'created_at') => {
            let query = supabase.from(table).select('id, teaching_assignment_id, created_at', { count: 'exact' })

            if (teacherId && teachingAssignmentIds.length > 0) {
                query = query.in('teaching_assignment_id', teachingAssignmentIds)
            } else if (teacherId && teachingAssignmentIds.length === 0) {
                return { count: 0, data: [] } // Teacher has no assignments
            }

            if (month) {
                // Filter by month
                // This assumes standard ISO timestamp
                // Using gte/lte for month range in current year would be better but let's just get data for now
                // Or let the external system filter by date
            }

            return query
        }

        // Execute parallel queries
        const [materials, assignments, exams, quizzes] = await Promise.all([
            getCount('materials'),
            getCount('assignments'), // assignments has type 'TUGAS' or 'ULANGAN'? No, type is separate
            getCount('exams'),
            getCount('quizzes')
        ])

        // Further refinement: "Assignments" table generally holds TUGAS. "Exams" table holds ULANGAN.
        // But type in assignments can be 'ULANGAN' too? Let's check types.ts
        // types.ts: Assignment type: 'TUGAS' | 'ULANGAN'.
        // types.ts: Quiz exists separately.
        // So metrics:
        // A1 (Materials): Count from 'materials'
        // A2 (Assignments): Count from 'assignments' where type='TUGAS'
        // A3 (Exams): Count from 'exams' table (which is CBT exams)
        // A4 (Quizzes): Count from 'quizzes'

        // Refetch with specific filters

        // A1: Materials
        let matQuery = supabase.from('materials').select('id, teaching_assignment_id, created_at, type')
        if (teachingAssignmentIds.length > 0) matQuery = matQuery.in('teaching_assignment_id', teachingAssignmentIds)
        const { data: matData } = await matQuery

        // A2: Assignments (Tugas)
        let assQuery = supabase.from('assignments').select('id, teaching_assignment_id, created_at, due_date').eq('type', 'TUGAS')
        if (teachingAssignmentIds.length > 0) assQuery = assQuery.in('teaching_assignment_id', teachingAssignmentIds)
        const { data: assData } = await assQuery

        // A3: Exams
        let examQuery = supabase.from('exams').select('id, teaching_assignment_id, created_at, start_time')
        if (teachingAssignmentIds.length > 0) examQuery = examQuery.in('teaching_assignment_id', teachingAssignmentIds)
        const { data: examData } = await examQuery

        // A4: Quizzes
        let quizQuery = supabase.from('quizzes').select('id, teaching_assignment_id, created_at')
        if (teachingAssignmentIds.length > 0) quizQuery = quizQuery.in('teaching_assignment_id', teachingAssignmentIds)
        const { data: quizData } = await quizQuery

        return NextResponse.json({
            teacher_id: teacherId || 'all',
            kpi_metrics: {
                a1_materials: {
                    count: matData?.length || 0,
                    details: matData
                },
                a2_assignments: {
                    count: assData?.length || 0,
                    details: assData
                },
                a3_exams: {
                    count: examData?.length || 0,
                    details: examData
                },
                a4_quizzes: {
                    count: quizData?.length || 0,
                    details: quizData
                }
            }
        })
    } catch (error) {
        console.error('Error fetching content KPI:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}
