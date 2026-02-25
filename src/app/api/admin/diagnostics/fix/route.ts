import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/supabase'
import { validateSession } from '@/lib/auth'

export async function POST(request: NextRequest) {
    try {
        const token = request.cookies.get('session_token')?.value
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const user = await validateSession(token)
        if (!user || user.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const { action } = await request.json()

        if (!action) {
            return NextResponse.json({ error: 'Action required' }, { status: 400 })
        }

        let result: { success: boolean; message: string; count: number } = {
            success: false,
            message: 'Action tidak dikenal',
            count: 0,
        }

        switch (action) {
            case 'clean_sessions': {
                const now = new Date().toISOString()
                const { data, error } = await supabase
                    .from('sessions')
                    .delete()
                    .lt('expires_at', now)
                    .select('id')

                if (error) throw error
                result = {
                    success: true,
                    message: `${data?.length || 0} sesi kadaluarsa berhasil dihapus`,
                    count: data?.length || 0,
                }
                break
            }

            case 'remove_orphan_students': {
                // Find students whose user_id doesn't match any user
                const { data: students } = await supabase
                    .from('students')
                    .select('id, user_id, user:users(id)')

                const orphans = (students || []).filter((s: any) => !s.user)
                if (orphans.length > 0) {
                    const { error } = await supabase
                        .from('students')
                        .delete()
                        .in('id', orphans.map(o => o.id))

                    if (error) throw error
                }
                result = {
                    success: true,
                    message: `${orphans.length} record siswa orphan berhasil dihapus`,
                    count: orphans.length,
                }
                break
            }

            case 'remove_orphan_teachers': {
                const { data: teachers } = await supabase
                    .from('teachers')
                    .select('id, user_id, user:users(id)')

                const orphans = (teachers || []).filter((t: any) => !t.user)
                if (orphans.length > 0) {
                    const { error } = await supabase
                        .from('teachers')
                        .delete()
                        .in('id', orphans.map(o => o.id))

                    if (error) throw error
                }
                result = {
                    success: true,
                    message: `${orphans.length} record guru orphan berhasil dihapus`,
                    count: orphans.length,
                }
                break
            }

            default:
                return NextResponse.json({ error: `Action "${action}" tidak dikenal` }, { status: 400 })
        }

        return NextResponse.json(result)
    } catch (error) {
        console.error('Diagnostic fix error:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}
