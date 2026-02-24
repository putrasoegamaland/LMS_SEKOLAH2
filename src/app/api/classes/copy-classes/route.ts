import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/supabase'
import { validateSession } from '@/lib/auth'

/**
 * POST /api/classes/copy-classes
 * Duplicate classes from one academic year to another.
 * Creates new classes with the same name, grade_level, school_level
 * but linked to the new academic year.
 * 
 * Body: { from_year_id: string, to_year_id: string }
 * Returns: { copied: number, skipped: number, total: number, class_mapping: Record<old_id, new_id> }
 */
export async function POST(request: NextRequest) {
    try {
        const token = request.cookies.get('session_token')?.value
        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const user = await validateSession(token)
        if (!user || user.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Admin only' }, { status: 401 })
        }

        const { from_year_id, to_year_id } = await request.json()

        if (!from_year_id || !to_year_id) {
            return NextResponse.json({ error: 'from_year_id and to_year_id are required' }, { status: 400 })
        }

        if (from_year_id === to_year_id) {
            return NextResponse.json({ error: 'Source and target year cannot be the same' }, { status: 400 })
        }

        // Verify both years exist
        const { data: years, error: yearsError } = await supabase
            .from('academic_years')
            .select('id, name')
            .in('id', [from_year_id, to_year_id])

        if (yearsError) throw yearsError
        if (!years || years.length !== 2) {
            return NextResponse.json({ error: 'One or both academic years not found' }, { status: 404 })
        }

        // Fetch source classes
        const { data: sourceClasses, error: sourceError } = await supabase
            .from('classes')
            .select('id, name, grade_level, school_level')
            .eq('academic_year_id', from_year_id)
            .order('school_level')
            .order('grade_level')

        if (sourceError) throw sourceError

        if (!sourceClasses || sourceClasses.length === 0) {
            return NextResponse.json({
                success: true,
                message: 'No classes found in source year',
                copied: 0,
                skipped: 0,
                total: 0,
                class_mapping: {}
            })
        }

        // Check existing classes in target year to avoid duplicates (by name + grade_level + school_level)
        const { data: existingClasses, error: existingError } = await supabase
            .from('classes')
            .select('id, name, grade_level, school_level')
            .eq('academic_year_id', to_year_id)

        if (existingError) throw existingError

        const existingKeys = new Set(
            (existingClasses || []).map(c => `${c.name}_${c.grade_level}_${c.school_level}`)
        )

        // Find existing class mapping for already-existing classes (for copy-assignments later)
        const existingMapping: Record<string, string> = {}
        for (const src of sourceClasses) {
            const existing = (existingClasses || []).find(c =>
                c.name === src.name && c.grade_level === src.grade_level && c.school_level === src.school_level
            )
            if (existing) {
                existingMapping[src.id] = existing.id
            }
        }

        // Filter classes that need to be created
        const classesToCreate = sourceClasses
            .filter(c => !existingKeys.has(`${c.name}_${c.grade_level}_${c.school_level}`))
            .map(c => ({
                name: c.name,
                grade_level: c.grade_level,
                school_level: c.school_level,
                academic_year_id: to_year_id
            }))

        if (classesToCreate.length === 0) {
            return NextResponse.json({
                success: true,
                message: 'All classes already exist in target year',
                copied: 0,
                skipped: sourceClasses.length,
                total: sourceClasses.length,
                class_mapping: existingMapping
            })
        }

        // Insert new classes
        const { data: newClasses, error: insertError } = await supabase
            .from('classes')
            .insert(classesToCreate)
            .select('id, name, grade_level, school_level')

        if (insertError) throw insertError

        // Build mapping: old class id -> new class id
        const classMapping: Record<string, string> = { ...existingMapping }
        for (const src of sourceClasses) {
            if (classMapping[src.id]) continue // Already mapped from existing
            const newCls = (newClasses || []).find(c =>
                c.name === src.name && c.grade_level === src.grade_level && c.school_level === src.school_level
            )
            if (newCls) {
                classMapping[src.id] = newCls.id
            }
        }

        const fromYear = years.find(y => y.id === from_year_id)
        const toYear = years.find(y => y.id === to_year_id)

        return NextResponse.json({
            success: true,
            message: `${newClasses?.length || 0} kelas berhasil disalin dari ${fromYear?.name} ke ${toYear?.name}`,
            copied: newClasses?.length || 0,
            skipped: sourceClasses.length - (newClasses?.length || 0),
            total: sourceClasses.length,
            class_mapping: classMapping
        })

    } catch (error: any) {
        console.error('Error copying classes:', error)
        return NextResponse.json({ error: 'Server error', details: error.message }, { status: 500 })
    }
}
