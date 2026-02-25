import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/supabase'
import { validateSession } from '@/lib/auth'

// PUT - Complete/End an academic year
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const token = request.cookies.get('session_token')?.value
        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const user = await validateSession(token)
        if (!user || user.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Get the current academic year
        const { data: currentYear, error: fetchError } = await supabase
            .from('academic_years')
            .select('*')
            .eq('id', id)
            .single()

        if (fetchError) throw fetchError

        if (!currentYear) {
            return NextResponse.json({ error: 'Tahun ajaran tidak ditemukan' }, { status: 404 })
        }

        // Update the academic year to COMPLETED
        const { data, error } = await supabase
            .from('academic_years')
            .update({
                status: 'COMPLETED',
                is_active: false,
                end_date: new Date().toISOString().split('T')[0] // Set end_date to today if not set
            })
            .eq('id', id)
            .select()
            .single()

        if (error) throw error

        return NextResponse.json({
            success: true,
            message: `Tahun ajaran ${data.name} berhasil diselesaikan`,
            data
        })
    } catch (error) {
        console.error('Error completing academic year:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}
