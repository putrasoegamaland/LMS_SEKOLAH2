import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/supabase'
import { validateSession } from '@/lib/auth'

// GET /api/announcements - Fetch announcements
export async function GET(req: NextRequest) {
    try {
        const token = req.cookies.get('session_token')?.value
        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const user = await validateSession(token)
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(req.url)
        const classId = searchParams.get('class_id')
        const limit = parseInt(searchParams.get('limit') || '20')

        let query = supabase
            .from('announcements')
            .select(`
                *,
                created_by_user:users!announcements_created_by_fkey(id, full_name)
            `)
            .eq('is_active', true)
            .order('published_at', { ascending: false })
            .limit(limit)

        // Filter by class for students
        if (user.role === 'SISWA' && classId) {
            // Get announcements that are global OR target this class
            query = query.or(`is_global.eq.true,class_ids.cs.{${classId}}`)
        }

        // Filter expired announcements
        query = query.or('expires_at.is.null,expires_at.gt.now()')

        const { data, error } = await query

        if (error) {
            console.error('Error fetching announcements:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json(data || [])
    } catch (error) {
        console.error('Error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

// POST /api/announcements - Create announcement (Admin only)
export async function POST(req: NextRequest) {
    try {
        const token = req.cookies.get('session_token')?.value
        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const user = await validateSession(token)
        if (!user || user.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const body = await req.json()
        const { title, content, is_global, class_ids, expires_at } = body

        if (!title || !content) {
            return NextResponse.json({ error: 'Title and content are required' }, { status: 400 })
        }

        const { data, error } = await supabase
            .from('announcements')
            .insert({
                title,
                content,
                is_global: is_global || false,
                class_ids: is_global ? [] : (class_ids || []),
                created_by: user.id,
                expires_at: expires_at || null,
                is_active: true
            })
            .select()
            .single()

        if (error) {
            console.error('Error creating announcement:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        // Send notifications to students
        try {
            let studentsQuery = supabase
                .from('students')
                .select('user_id, class_id')

            // If global, notify all students; otherwise only target classes
            if (!is_global && class_ids && class_ids.length > 0) {
                studentsQuery = studentsQuery.in('class_id', class_ids)
            }

            const { data: students } = await studentsQuery

            if (students && students.length > 0) {
                const notifications = students.map(student => ({
                    user_id: student.user_id,
                    type: 'PENGUMUMAN',
                    title: `📢 ${title}`,
                    message: content.length > 100 ? content.substring(0, 100) + '...' : content,
                    link: '/dashboard/siswa'
                }))

                await supabase.from('notifications').insert(notifications)
            }
        } catch (notifError) {
            console.error('Error sending notifications:', notifError)
            // Don't fail the request if notifications fail
        }

        return NextResponse.json(data, { status: 201 })
    } catch (error) {
        console.error('Error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}


