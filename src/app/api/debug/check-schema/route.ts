import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/supabase'
import { getSchoolContextOrError, isErrorResponse } from '@/lib/schoolContext'

// Check if quiz tables exist in database
export async function GET(request: NextRequest) {
    try {
        const ctx = await getSchoolContextOrError(request)
        if (isErrorResponse(ctx)) return ctx
        const { user, schoolId } = ctx

        if (user.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const tables = ['quizzes', 'quiz_questions', 'quiz_submissions', 'question_bank']
        const results: any = {}

        for (const table of tables) {
            try {
                const { data, error } = await supabase
                    .from(table)
                    .select('id')
                    .limit(1)

                results[table] = {
                    exists: !error,
                    error: error?.message || null
                }
            } catch (e) {
                results[table] = {
                    exists: false,
                    error: String(e)
                }
            }
        }

        const allExist = Object.values(results).every((r: any) => r.exists)

        return NextResponse.json({
            schemaReady: allExist,
            tables: results,
            message: allExist
                ? '✅ All quiz tables exist!'
                : '⚠️ Some tables are missing. Please run quiz_schema.sql in Supabase SQL Editor.'
        })
    } catch (error) {
        return NextResponse.json({
            error: 'Server error',
            details: String(error)
        }, { status: 500 })
    }
}
