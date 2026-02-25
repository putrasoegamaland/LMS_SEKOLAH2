import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/supabase'
import { validateSession } from '@/lib/auth'

// GET all academic years
export async function GET(request: NextRequest) {
    try {
        const token = request.cookies.get('session_token')?.value
        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const user = await validateSession(token)
        if (!user || (user.role !== 'ADMIN' && user.role !== 'GURU')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { data, error } = await supabase
            .from('academic_years')
            .select('*')
            .order('created_at', { ascending: false })

        if (error) throw error

        return NextResponse.json(data)
    } catch (error) {
        console.error('Error fetching academic years:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}

// POST new academic year
export async function POST(request: NextRequest) {
    try {
        const token = request.cookies.get('session_token')?.value
        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const user = await validateSession(token)
        if (!user || user.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { name, start_date, end_date, status, is_active } = await request.json()

        if (!name) {
            return NextResponse.json({ error: 'Nama tahun ajaran harus diisi' }, { status: 400 })
        }

        // Determine status and is_active values
        // If status is ACTIVE, set is_active = true
        // If is_active is true, set status = ACTIVE
        const finalStatus = status || (is_active ? 'ACTIVE' : 'PLANNED')
        const finalIsActive = is_active || status === 'ACTIVE'

        // If setting as active, deactivate others first
        if (finalIsActive) {
            await supabase
                .from('academic_years')
                .update({ is_active: false, status: 'COMPLETED' })
                .eq('is_active', true)
        }

        const { data, error } = await supabase
            .from('academic_years')
            .insert({
                name,
                start_date: start_date || null,
                end_date: end_date || null,
                status: finalStatus,
                is_active: finalIsActive
            })
            .select()
            .single()

        if (error) throw error

        return NextResponse.json(data)
    } catch (error) {
        console.error('Error creating academic year:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}
