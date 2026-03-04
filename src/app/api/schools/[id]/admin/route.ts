import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/supabase'
import { hashPassword } from '@/lib/auth'
import { getSchoolContextOrError, isErrorResponse } from '@/lib/schoolContext'

/**
 * GET /api/schools/[id]/admin
 * List admin users for a school (SUPER_ADMIN only)
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const ctx = await getSchoolContextOrError(request)
        if (isErrorResponse(ctx)) return ctx
        const { user } = ctx

        if (user.role !== 'SUPER_ADMIN') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const { data: admins, error } = await supabase
            .from('users')
            .select('id, username, full_name, created_at')
            .eq('school_id', id)
            .eq('role', 'ADMIN')
            .order('created_at', { ascending: false })

        if (error) throw error

        return NextResponse.json(admins || [])
    } catch (error) {
        console.error('Error fetching admins:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}

/**
 * POST /api/schools/[id]/admin
 * Create admin user for a school (SUPER_ADMIN only)
 */
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: schoolId } = await params
        const ctx = await getSchoolContextOrError(request)
        if (isErrorResponse(ctx)) return ctx
        const { user } = ctx

        if (user.role !== 'SUPER_ADMIN') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const { username, password, full_name } = await request.json()

        if (!username || !password || !full_name) {
            return NextResponse.json(
                { error: 'Username, password, dan nama lengkap harus diisi' },
                { status: 400 }
            )
        }

        // Verify school exists
        const { data: school, error: schoolError } = await supabase
            .from('schools')
            .select('id, name')
            .eq('id', schoolId)
            .single()

        if (schoolError || !school) {
            return NextResponse.json({ error: 'Sekolah tidak ditemukan' }, { status: 404 })
        }

        // Check username globally unique
        const { data: existing } = await supabase
            .from('users')
            .select('id')
            .eq('username', username)
            .single()

        if (existing) {
            return NextResponse.json({ error: 'Username sudah digunakan' }, { status: 400 })
        }

        const password_hash = await hashPassword(password)

        const { data: newAdmin, error: createError } = await supabase
            .from('users')
            .insert({
                username,
                password_hash,
                full_name,
                role: 'ADMIN',
                school_id: schoolId
            })
            .select('id, username, full_name, role, school_id, created_at')
            .single()

        if (createError) throw createError

        return NextResponse.json(newAdmin)
    } catch (error) {
        console.error('Error creating admin:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}

/**
 * PUT /api/schools/[id]/admin
 * Reset admin password (SUPER_ADMIN only)
 * Body: { user_id, new_password }
 */
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: schoolId } = await params
        const ctx = await getSchoolContextOrError(request)
        if (isErrorResponse(ctx)) return ctx
        const { user } = ctx

        if (user.role !== 'SUPER_ADMIN') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const { user_id, new_password } = await request.json()

        if (!user_id || !new_password) {
            return NextResponse.json(
                { error: 'user_id dan new_password harus diisi' },
                { status: 400 }
            )
        }

        // Verify admin belongs to this school
        const { data: adminUser, error: findError } = await supabase
            .from('users')
            .select('id, role, school_id')
            .eq('id', user_id)
            .eq('school_id', schoolId)
            .eq('role', 'ADMIN')
            .single()

        if (findError || !adminUser) {
            return NextResponse.json({ error: 'Admin tidak ditemukan di sekolah ini' }, { status: 404 })
        }

        const password_hash = await hashPassword(new_password)

        const { error: updateError } = await supabase
            .from('users')
            .update({ password_hash })
            .eq('id', user_id)

        if (updateError) throw updateError

        return NextResponse.json({ success: true, message: 'Password berhasil direset' })
    } catch (error) {
        console.error('Error resetting admin password:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}
