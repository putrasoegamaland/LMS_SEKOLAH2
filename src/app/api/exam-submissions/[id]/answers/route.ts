import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { validateSession } from '@/lib/auth'

// GET answers for a specific exam submission
export async function GET(
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
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { data, error } = await supabase
            .from('exam_answers')
            .select(`
                id,
                question_id,
                answer,
                is_correct,
                points_earned
            `)
            .eq('submission_id', id)
            .order('created_at', { ascending: true })

        if (error) throw error

        return NextResponse.json(data || [])
    } catch (error) {
        console.error('Error fetching exam answers:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}
