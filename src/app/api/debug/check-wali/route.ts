import { NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET() {
    try {
        const { data: users, error: userError } = await supabase
            .from('users')
            .select('id, username, full_name, role')
            .like('username', '%.wali')

        const { data: students, error: studentError } = await supabase
            .from('students')
            .select('id, user_id, parent_user_id, status, user:users!students_user_id_fkey(username)')

        return NextResponse.json({
            users: users || [],
            students: students || [],
            userError,
            studentError
        })
    } catch (e: any) {
        return NextResponse.json({ error: e.message })
    }
}
