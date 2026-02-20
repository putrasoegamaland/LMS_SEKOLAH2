import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { validateSession } from '@/lib/auth'

/**
 * GET /api/admin/review-queue
 * 
 * Fetch all questions for admin review.
 * Shows all questions from all sources, with optional status filtering.
 * 
 * Query params:
 * - source: 'bank' | 'quiz' | 'exam' (optional filter)
 * - status: 'admin_review' | 'approved' | 'ai_reviewing' | 'returned' | 'draft' (optional)
 * - page: page number (default 1)
 * - limit: items per page (default 20)
 */
export async function GET(request: NextRequest) {
    try {
        const token = request.cookies.get('session_token')?.value
        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const user = await validateSession(token)
        if (!user || user.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Unauthorized - Admin only' }, { status: 403 })
        }

        const source = request.nextUrl.searchParams.get('source')
        const statusFilter = request.nextUrl.searchParams.get('status')
        const page = parseInt(request.nextUrl.searchParams.get('page') || '1')
        const limit = parseInt(request.nextUrl.searchParams.get('limit') || '20')
        const offset = (page - 1) * limit

        // Build results from all 3 question tables
        const results: any[] = []
        let totalCount = 0

        // Helper: fetch questions by source with their AI reviews
        async function fetchBySource(
            tableName: string,
            sourceType: string,
            extraSelect: string = ''
        ) {
            let query = supabase
                .from(tableName)
                .select(`*, ${extraSelect}`, { count: 'exact' })

            // Apply status filter if provided, otherwise show all
            if (statusFilter) {
                query = query.eq('status', statusFilter)
            }

            const { data, count, error } = await query
                .order('created_at', { ascending: false })
                .limit(1000)

            if (error) {
                console.error(`Error fetching ${sourceType} questions:`, error)
                return []
            }

            if (count) totalCount += count

            if (!data) return []

            // Fetch AI reviews for these questions
            const questionIds = data.map((q: any) => q.id)
            const { data: reviews } = await supabase
                .from('ai_reviews')
                .select('*')
                .eq('question_source', sourceType)
                .in('question_id', questionIds)

            // Map reviews to questions
            const reviewMap = new Map()
            reviews?.forEach((r: any) => reviewMap.set(r.question_id, r))

            return data.map((q: any) => ({
                ...q,
                question_source: sourceType,
                ai_review: reviewMap.get(q.id) || null
            }))
        }

        // Fetch based on source filter or all
        if (!source || source === 'bank') {
            const bankData = await fetchBySource(
                'question_bank', 'bank',
                'subject:subjects(id, name), teacher:teachers(id, user:users(full_name))'
            )
            results.push(...bankData)
        }

        if (!source || source === 'quiz') {
            const quizData = await fetchBySource(
                'quiz_questions', 'quiz',
                'quiz:quizzes(id, title, teaching_assignment:teaching_assignments(subject:subjects(name), class:classes(name, school_level), teacher:teachers(id, user:users(full_name))))'
            )
            results.push(...quizData)
        }

        if (!source || source === 'exam') {
            const examData = await fetchBySource(
                'exam_questions', 'exam',
                'exam:exams(id, title, teaching_assignment:teaching_assignments(subject:subjects(name), class:classes(name, school_level), teacher:teachers(id, user:users(full_name))))'
            )
            results.push(...examData)
        }

        // Sort by AI review priority (lower = higher priority), then by date
        results.sort((a, b) => {
            const prioA = a.ai_review?.full_json_report?.priority || 100
            const prioB = b.ai_review?.full_json_report?.priority || 100
            if (prioA !== prioB) return prioA - prioB
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        })

        // Paginate using the true database count
        const total = totalCount || results.length
        const paginated = results.slice(offset, offset + limit)

        return NextResponse.json({
            data: paginated,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        })

    } catch (error) {
        console.error('Error fetching review queue:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}

/**
 * POST /api/admin/review-queue
 * 
 * Admin action on a question: approve, return, or archive.
 * 
 * Body:
 * {
 *   question_id: string,
 *   question_source: 'bank' | 'quiz' | 'exam',
 *   decision: 'approve' | 'return' | 'archive',
 *   notes?: string,
 *   return_reasons?: string[],
 *   override_bloom?: number,
 *   override_hots_strength?: string,
 *   override_difficulty?: string,
 *   override_boundedness?: string
 * }
 */
export async function POST(request: NextRequest) {
    try {
        const token = request.cookies.get('session_token')?.value
        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const user = await validateSession(token)
        if (!user || user.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Unauthorized - Admin only' }, { status: 403 })
        }

        const body = await request.json()
        const {
            question_id,
            question_source,
            decision,
            notes,
            return_reasons,
            override_bloom,
            override_hots_strength,
            override_difficulty,
            override_boundedness
        } = body

        if (!question_id || !question_source || !decision) {
            return NextResponse.json(
                { error: 'question_id, question_source, dan decision diperlukan' },
                { status: 400 }
            )
        }

        if (!['approve', 'return', 'archive'].includes(decision)) {
            return NextResponse.json(
                { error: 'decision harus approve, return, atau archive' },
                { status: 400 }
            )
        }

        // 1. Save admin review
        const { error: reviewError } = await supabase
            .from('admin_reviews')
            .insert({
                question_source,
                question_id,
                reviewer_id: user.id,
                decision,
                notes: notes || null,
                return_reasons: return_reasons || null,
                override_bloom: override_bloom || null,
                override_hots_strength: override_hots_strength || null,
                override_difficulty: override_difficulty || null,
                override_boundedness: override_boundedness || null
            })

        if (reviewError) {
            console.error('Error saving admin review:', reviewError)
            throw reviewError
        }

        // 2. Update question status
        const tableName = question_source === 'bank' ? 'question_bank'
            : question_source === 'quiz' ? 'quiz_questions'
                : 'exam_questions'

        const statusMap: Record<string, string> = {
            approve: 'approved',
            return: 'returned',
            archive: 'archived'
        }

        const { error: updateError } = await supabase
            .from(tableName)
            .update({ status: statusMap[decision] })
            .eq('id', question_id)

        if (updateError) {
            console.error('Error updating question status:', updateError)
            throw updateError
        }

        return NextResponse.json({
            success: true,
            question_id,
            new_status: statusMap[decision]
        })

    } catch (error) {
        console.error('Error processing admin review:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}
