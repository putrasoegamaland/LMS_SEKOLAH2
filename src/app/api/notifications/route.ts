import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { validateSession } from '@/lib/auth'

// GET notifications for current user
export async function GET(request: NextRequest) {
    try {
        const token = request.cookies.get('session_token')?.value
        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const user = await validateSession(token)
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const unreadOnly = request.nextUrl.searchParams.get('unread') === 'true'
        const limit = parseInt(request.nextUrl.searchParams.get('limit') || '20')

        // Fix #4: Auto-cleanup — delete notifications older than 30 days (lazy cleanup)
        try {
            const thirtyDaysAgo = new Date()
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
            await supabase
                .from('notifications')
                .delete()
                .eq('user_id', user.id)
                .eq('is_read', true)
                .lt('created_at', thirtyDaysAgo.toISOString())
        } catch (cleanupError) {
            console.error('Notification cleanup error:', cleanupError)
        }

        // Fix #5: Deadline reminder — check for assignments due within 24 hours
        if (user.role === 'SISWA') {
            try {
                // Get student's class
                const { data: student } = await supabase
                    .from('students')
                    .select('class_id')
                    .eq('user_id', user.id)
                    .single()

                if (student) {
                    // Get teaching assignments for student's class
                    const { data: tas } = await supabase
                        .from('teaching_assignments')
                        .select('id')
                        .eq('class_id', student.class_id)

                    if (tas && tas.length > 0) {
                        const taIds = tas.map(t => t.id)
                        const now = new Date()
                        const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000)

                        // Find assignments with deadline within 24 hours
                        const { data: urgentAssignments } = await supabase
                            .from('assignments')
                            .select('id, title, deadline, teaching_assignment_id')
                            .in('teaching_assignment_id', taIds)
                            .gt('deadline', now.toISOString())
                            .lte('deadline', in24h.toISOString())

                        if (urgentAssignments && urgentAssignments.length > 0) {
                            for (const assignment of urgentAssignments) {
                                // Check if student already submitted
                                const { data: existingSub } = await supabase
                                    .from('submissions')
                                    .select('id')
                                    .eq('assignment_id', assignment.id)
                                    .eq('student_id', student.class_id) // just need to check by user
                                    .limit(1)

                                // Check if reminder already sent (within last 24h)
                                const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
                                const { data: existingReminder } = await supabase
                                    .from('notifications')
                                    .select('id')
                                    .eq('user_id', user.id)
                                    .eq('type', 'DEADLINE_REMINDER')
                                    .ilike('title', `%${assignment.title}%`)
                                    .gt('created_at', twentyFourHoursAgo.toISOString())
                                    .limit(1)

                                if ((!existingSub || existingSub.length === 0) && (!existingReminder || existingReminder.length === 0)) {
                                    const deadlineStr = new Date(assignment.deadline).toLocaleString('id-ID')
                                    await supabase.from('notifications').insert({
                                        user_id: user.id,
                                        type: 'DEADLINE_REMINDER',
                                        title: `⏰ Deadline Segera: ${assignment.title}`,
                                        message: `Tugas ini harus dikumpulkan sebelum ${deadlineStr}`,
                                        link: '/dashboard/siswa/tugas'
                                    })
                                }
                            }
                        }
                    }
                }
            } catch (deadlineError) {
                console.error('Deadline reminder error:', deadlineError)
                // Don't block the main notification fetch
            }
        }

        let query = supabase
            .from('notifications')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(limit)

        if (unreadOnly) {
            query = query.eq('is_read', false)
        }

        const { data, error } = await query

        if (error) throw error

        // Get unread count
        const { count } = await supabase
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('is_read', false)

        return NextResponse.json({
            notifications: data || [],
            unreadCount: count || 0
        })
    } catch (error) {
        console.error('Error fetching notifications:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}

// POST create notification (for internal use / triggers)
export async function POST(request: NextRequest) {
    try {
        const token = request.cookies.get('session_token')?.value
        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const user = await validateSession(token)
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { user_ids, type, title, message, link } = body

        if (!user_ids || !Array.isArray(user_ids) || user_ids.length === 0) {
            return NextResponse.json({ error: 'user_ids required' }, { status: 400 })
        }

        if (!type || !title) {
            return NextResponse.json({ error: 'type and title required' }, { status: 400 })
        }

        // Create notifications for all target users
        const notifications = user_ids.map((uid: string) => ({
            user_id: uid,
            type,
            title,
            message: message || null,
            link: link || null
        }))

        const { data, error } = await supabase
            .from('notifications')
            .insert(notifications)
            .select()

        if (error) throw error

        return NextResponse.json({ success: true, count: data?.length || 0 })
    } catch (error) {
        console.error('Error creating notifications:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}

// PUT mark as read
export async function PUT(request: NextRequest) {
    try {
        const token = request.cookies.get('session_token')?.value
        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const user = await validateSession(token)
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { notification_id, mark_all } = body

        if (mark_all) {
            // Mark all as read
            const { error } = await supabase
                .from('notifications')
                .update({ is_read: true })
                .eq('user_id', user.id)
                .eq('is_read', false)

            if (error) throw error

            return NextResponse.json({ success: true })
        }

        if (!notification_id) {
            return NextResponse.json({ error: 'notification_id required' }, { status: 400 })
        }

        // Mark single notification as read
        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('id', notification_id)
            .eq('user_id', user.id)

        if (error) throw error

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error updating notification:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}
