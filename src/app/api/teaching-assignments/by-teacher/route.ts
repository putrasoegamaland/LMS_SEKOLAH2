import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/supabase'
import { validateSession } from '@/lib/auth'

// GET assignments grouped by teacher
export async function GET(request: NextRequest) {
    try {
        const token = request.cookies.get('session_token')?.value
        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const user = await validateSession(token)
        if (!user || user.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Admin only' }, { status: 401 })
        }

        const academicYearId = request.nextUrl.searchParams.get('academic_year_id')

        // Get all teachers with their assignments
        const { data: teachers, error: teachersError } = await supabase
            .from('teachers')
            .select(`
                id,
                nip,
                user:users(id, full_name, username)
            `)
            .order('nip')

        if (teachersError) throw teachersError

        // Get all assignments for this academic year
        let assignmentsQuery = supabase
            .from('teaching_assignments')
            .select(`
                id,
                teacher_id,
                subject:subjects(id, name),
                class:classes(id, name, school_level, grade_level)
            `)

        if (academicYearId) {
            assignmentsQuery = assignmentsQuery.eq('academic_year_id', academicYearId)
        }

        const { data: assignments, error: assignmentsError } = await assignmentsQuery

        if (assignmentsError) throw assignmentsError

        // Group assignments by teacher
        const result = teachers?.map(teacher => {
            const teacherAssignments = assignments?.filter(a => a.teacher_id === teacher.id) || []

            // Group by subject
            const subjectsMap = new Map<string, {
                subject: { id: string; name: string }
                classes: Array<{ id: string; name: string; school_level: string; grade_level: number }>
            }>()

            teacherAssignments.forEach(assignment => {
                const subjectId = (assignment.subject as any)?.id
                if (!subjectId) return

                if (!subjectsMap.has(subjectId)) {
                    subjectsMap.set(subjectId, {
                        subject: assignment.subject as any,
                        classes: []
                    })
                }

                const classData = assignment.class as any
                if (classData) {
                    subjectsMap.get(subjectId)!.classes.push({
                        id: classData.id,
                        name: classData.name,
                        school_level: classData.school_level,
                        grade_level: classData.grade_level
                    })
                }
            })

            // Sort classes by name within each subject
            subjectsMap.forEach(subjectData => {
                subjectData.classes.sort((a, b) => a.name.localeCompare(b.name))
            })

            return {
                teacher: {
                    id: teacher.id,
                    nip: teacher.nip,
                    name: (teacher.user as any)?.full_name || (teacher.user as any)?.username || '-'
                },
                subjects: Array.from(subjectsMap.values()),
                total_classes: teacherAssignments.length,
                assignment_ids: teacherAssignments.map(a => a.id)
            }
        }) || []

        // Sort: teachers without assignments first, then alphabetically
        result.sort((a, b) => {
            if (a.total_classes === 0 && b.total_classes > 0) return -1
            if (a.total_classes > 0 && b.total_classes === 0) return 1
            return a.teacher.name.localeCompare(b.teacher.name)
        })

        return NextResponse.json(result)
    } catch (error) {
        console.error('Error fetching assignments by teacher:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}
