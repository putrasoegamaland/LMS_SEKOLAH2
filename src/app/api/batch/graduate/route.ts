import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/supabase'
import { getSchoolContextOrError, isErrorResponse } from '@/lib/schoolContext'
import { BatchGraduateRequest, BatchPromotionResult } from '@/lib/types'

/**
 * POST /api/batch/graduate
 * Batch graduate students (mark as completed education)
 */
export async function POST(request: NextRequest) {
    try {
        // Verify authentication
        const ctx = await getSchoolContextOrError(request)
        if (isErrorResponse(ctx)) return ctx
        const { user, schoolId } = ctx

        // Only admins can perform batch operations
        if (user.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
        }

        const body: BatchGraduateRequest = await request.json()
        const { student_ids, academic_year_id, notes } = body

        // Validation
        if (!student_ids || student_ids.length === 0 || !academic_year_id) {
            return NextResponse.json({
                error: 'Required fields: student_ids (array), academic_year_id'
            }, { status: 400 })
        }

        // Verify academic year exists (scoped to school)
        let yearQuery = supabase
            .from('academic_years')
            .select('id, name')
            .eq('id', academic_year_id)
        if (schoolId) yearQuery = yearQuery.eq('school_id', schoolId)
        const { data: academicYear, error: yearError } = await yearQuery.single()

        if (yearError || !academicYear) {
            return NextResponse.json({ error: 'Academic year not found' }, { status: 404 })
        }

        // Get students with their enrollments
        const { data: students, error: studentsError } = await supabase
            .from('students')
            .select(`
                id,
                user:users!students_user_id_fkey(full_name),
                class:classes(name, grade_level, school_level),
                enrollments:student_enrollments!student_enrollments_student_id_fkey(
                    id,
                    class_id,
                    academic_year_id,
                    status
                )
            `)
            .in('id', student_ids)

        if (studentsError) {
            return NextResponse.json({
                error: 'Failed to fetch students',
                details: studentsError.message
            }, { status: 500 })
        }

        if (!students || students.length === 0) {
            return NextResponse.json({
                error: 'No students found with provided IDs'
            }, { status: 404 })
        }

        // Process each student graduation
        const result: BatchPromotionResult = {
            success: true,
            promoted_count: 0, // Using same field for graduated count
            failed_count: 0,
            errors: []
        }

        // BATCH OPTIMIZATION: Validate all students in memory, then batch DB operations
        const now = new Date().toISOString()
        const graduationNotes = notes || 'Batch graduation processed'

        // 1. Validate and prepare batch data
        const enrollmentIdsToEnd: { id: string; className: string }[] = []
        const studentIdsToGraduate: string[] = []

        for (const student of students) {
            const activeEnrollment = student.enrollments?.find((e: any) =>
                e.status === 'ACTIVE' && e.academic_year_id === academic_year_id
            )

            if (!activeEnrollment) {
                result.failed_count++
                const userName = (student.user as { full_name?: string } | null)?.full_name || 'Unknown'
                result.errors.push({
                    student_id: student.id,
                    student_name: userName,
                    error: 'No active enrollment in specified academic year'
                })
                continue
            }

            enrollmentIdsToEnd.push({
                id: activeEnrollment.id,
                className: (student.class as { name?: string } | null)?.name || 'class'
            })
            studentIdsToGraduate.push(student.id)
            result.promoted_count++
        }

        // 2. Execute batch DB operations (2 queries instead of 2 × N)
        if (enrollmentIdsToEnd.length > 0) {
            // Batch end enrollments
            const { error: endError } = await supabase
                .from('student_enrollments')
                .update({
                    status: 'GRADUATED',
                    ended_at: now,
                    updated_at: now,
                    notes: graduationNotes
                })
                .in('id', enrollmentIdsToEnd.map(e => e.id))

            if (endError) throw endError

            // Batch update student status
            const { error: updateError } = await supabase
                .from('students')
                .update({
                    class_id: null,
                    status: 'GRADUATED'
                })
                .in('id', studentIdsToGraduate)

            if (updateError) throw updateError
        }

        // Determine overall success
        result.success = result.failed_count === 0

        return NextResponse.json({
            ...result,
            message: `Batch graduation completed: ${result.promoted_count} graduated, ${result.failed_count} failed`
        })

    } catch (error: any) {
        console.error('Error in batch graduation:', error)
        return NextResponse.json({
            error: 'Internal server error',
            details: error.message
        }, { status: 500 })
    }
}
