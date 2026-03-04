import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/supabase'
import { getSchoolContextOrError, isErrorResponse } from '@/lib/schoolContext'

// GET single academic year
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const ctx = await getSchoolContextOrError(request)
        if (isErrorResponse(ctx)) return ctx
        const { user, schoolId } = ctx

        if (user.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        let query = supabase
            .from('academic_years')
            .select('*')
            .eq('id', id)
        if (schoolId) query = query.eq('school_id', schoolId)
        const { data, error } = await query.single()

        if (error) throw error

        return NextResponse.json(data)
    } catch (error) {
        console.error('Error fetching academic year:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}

// PUT update academic year
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const ctx = await getSchoolContextOrError(request)
        if (isErrorResponse(ctx)) return ctx
        const { user, schoolId } = ctx

        if (user.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { name, start_date, end_date, status, is_active } = await request.json()

        // Sync status and is_active
        const finalStatus = status || (is_active ? 'ACTIVE' : undefined)
        const finalIsActive = is_active !== undefined ? is_active : (status === 'ACTIVE')

        // If setting as active, deactivate others in same school first
        if (finalIsActive) {
            let deactivateQuery = supabase
                .from('academic_years')
                .update({ is_active: false, status: 'COMPLETED' })
                .neq('id', id)
                .eq('is_active', true)
            if (schoolId) deactivateQuery = deactivateQuery.eq('school_id', schoolId)
            await deactivateQuery
        }

        // Build update object with only provided fields
        const updateData: Record<string, any> = {}
        if (name !== undefined) updateData.name = name
        if (start_date !== undefined) updateData.start_date = start_date
        if (end_date !== undefined) updateData.end_date = end_date
        if (finalStatus !== undefined) updateData.status = finalStatus
        if (finalIsActive !== undefined) updateData.is_active = finalIsActive

        let updateQuery = supabase
            .from('academic_years')
            .update(updateData)
            .eq('id', id)
        if (schoolId) updateQuery = updateQuery.eq('school_id', schoolId)
        const { data, error } = await updateQuery
            .select()
            .single()

        if (error) throw error

        return NextResponse.json(data)
    } catch (error) {
        console.error('Error updating academic year:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}

// DELETE academic year with cascade
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const ctx = await getSchoolContextOrError(request)
        if (isErrorResponse(ctx)) return ctx
        const { user, schoolId } = ctx

        if (user.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Verify ownership: check year belongs to school
        if (schoolId) {
            const { data: yearCheck } = await supabase
                .from('academic_years')
                .select('id')
                .eq('id', id)
                .eq('school_id', schoolId)
                .single()
            if (!yearCheck) {
                return NextResponse.json({ error: 'Tahun ajaran tidak ditemukan' }, { status: 404 })
            }
        }

        // Get all classes in this academic year
        const { data: classes } = await supabase
            .from('classes')
            .select('id')
            .eq('academic_year_id', id)

        const classIds = classes?.map(c => c.id) || []

        // Get all teaching assignments in this academic year
        const { data: teachingAssignments } = await supabase
            .from('teaching_assignments')
            .select('id')
            .eq('academic_year_id', id)

        const taIds = teachingAssignments?.map(ta => ta.id) || []

        // Delete children of teaching assignments
        if (taIds.length > 0) {
            // Get assignments to delete their submissions
            const { data: assignments } = await supabase
                .from('assignments')
                .select('id')
                .in('teaching_assignment_id', taIds)

            if (assignments && assignments.length > 0) {
                const assignmentIds = assignments.map(a => a.id)

                // Get submissions to delete their grades
                const { data: submissions } = await supabase
                    .from('student_submissions')
                    .select('id')
                    .in('assignment_id', assignmentIds)

                if (submissions && submissions.length > 0) {
                    const submissionIds = submissions.map(s => s.id)
                    await supabase.from('grades').delete().in('submission_id', submissionIds)
                }

                await supabase.from('student_submissions').delete().in('assignment_id', assignmentIds)
            }

            // Get quizzes to delete their submissions
            const { data: quizzes } = await supabase
                .from('quizzes')
                .select('id')
                .in('teaching_assignment_id', taIds)

            if (quizzes && quizzes.length > 0) {
                const quizIds = quizzes.map(q => q.id)
                await supabase.from('quiz_submissions').delete().in('quiz_id', quizIds)
                await supabase.from('quiz_questions').delete().in('quiz_id', quizIds)
            }

            // Get exams to delete their submissions
            const { data: exams } = await supabase
                .from('exams')
                .select('id')
                .in('teaching_assignment_id', taIds)

            if (exams && exams.length > 0) {
                const examIds = exams.map(e => e.id)
                await supabase.from('exam_submissions').delete().in('exam_id', examIds)
                await supabase.from('exam_questions').delete().in('exam_id', examIds)
            }

            // Delete materials, assignments, quizzes, exams
            await supabase.from('materials').delete().in('teaching_assignment_id', taIds)
            await supabase.from('assignments').delete().in('teaching_assignment_id', taIds)
            await supabase.from('quizzes').delete().in('teaching_assignment_id', taIds)
            await supabase.from('exams').delete().in('teaching_assignment_id', taIds)
        }

        // Delete teaching assignments
        await supabase.from('teaching_assignments').delete().eq('academic_year_id', id)

        // Delete student enrollments
        await supabase.from('student_enrollments').delete().eq('academic_year_id', id)

        // Clear class_id from students that belong to classes being deleted
        if (classIds.length > 0) {
            await supabase
                .from('students')
                .update({ class_id: null })
                .in('class_id', classIds)
        }

        // Delete classes
        await supabase.from('classes').delete().eq('academic_year_id', id)

        // Finally delete the academic year
        const { error } = await supabase
            .from('academic_years')
            .delete()
            .eq('id', id)

        if (error) throw error

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error deleting academic year:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}
