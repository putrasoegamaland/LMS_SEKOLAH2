import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { validateSession } from '@/lib/auth'
import { analyzeQuestion, type HOTSAnalysisInput } from '@/lib/hotsQC'
import { determineRouting, type RoutingInput } from '@/lib/routingRules'

/**
 * POST /api/ai/hots-analyze
 * 
 * Analyze a question for HOTS/Bloom's Taxonomy quality.
 * Can be called standalone or automatically after question save.
 * 
 * Body:
 * {
 *   question_id: string,         // UUID of the question
 *   question_source: 'bank' | 'quiz' | 'exam',
 *   question_text: string,
 *   question_type: string,
 *   options?: string[],
 *   correct_answer?: string,
 *   teacher_difficulty?: string,
 *   teacher_hots_claim?: boolean,
 *   subject_name?: string,
 *   grade_band?: string           // 'SMP' or 'SMA'
 * }
 */
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
        const {
            question_id,
            question_source,
            question_text,
            question_type,
            options,
            correct_answer,
            teacher_difficulty,
            teacher_hots_claim,
            subject_name,
            grade_band
        } = body

        if (!question_id || !question_source || !question_text) {
            return NextResponse.json(
                { error: 'question_id, question_source, dan question_text diperlukan' },
                { status: 400 }
            )
        }

        if (!['bank', 'quiz', 'exam'].includes(question_source)) {
            return NextResponse.json(
                { error: 'question_source harus bank, quiz, atau exam' },
                { status: 400 }
            )
        }

        // 1. Update question status to 'ai_reviewing'
        const tableName = question_source === 'bank' ? 'question_bank'
            : question_source === 'quiz' ? 'quiz_questions'
                : 'exam_questions'

        await supabase
            .from(tableName)
            .update({ status: 'ai_reviewing' })
            .eq('id', question_id)

        // 2. Run AI analysis
        const analysisInput: HOTSAnalysisInput = {
            question_text,
            question_type: question_type || 'MULTIPLE_CHOICE',
            options: options || null,
            correct_answer: correct_answer || null,
            teacher_difficulty,
            teacher_hots_claim: teacher_hots_claim || false,
            subject_name,
            grade_band
        }

        const analysisResult = await analyzeQuestion(analysisInput)

        if (!analysisResult.success || !analysisResult.data) {
            // AI failed — set status back to draft
            await supabase
                .from(tableName)
                .update({ status: 'draft' })
                .eq('id', question_id)

            return NextResponse.json({
                success: false,
                error: analysisResult.error || 'AI analysis failed',
                status: 'draft'
            }, { status: 500 })
        }

        const aiData = analysisResult.data

        // 3. Save AI review to database
        const { error: reviewError } = await supabase
            .from('ai_reviews')
            .insert({
                question_source,
                question_id,
                primary_bloom_level: aiData.primary_bloom_level,
                secondary_bloom_levels: aiData.secondary_bloom_levels,
                hots_flag: aiData.hots.flag,
                hots_strength: aiData.hots.strength,
                hots_signals: aiData.hots.signals,
                boundedness: aiData.boundedness,
                difficulty_score: aiData.difficulty.score_1_10,
                difficulty_label: aiData.difficulty.label,
                difficulty_reasons: aiData.difficulty.reasons,
                clarity_score: aiData.quality.clarity_score_0_100,
                ambiguity_flags: aiData.quality.ambiguity_flags,
                missing_info_flags: aiData.quality.missing_info_flags,
                grade_fit_flags: aiData.quality.grade_fit_flags,
                subject_match_score: aiData.alignment.subject_match_score_0_100,
                suggested_edits: aiData.suggested_edits,
                bloom_confidence: aiData.confidence.bloom,
                hots_confidence: aiData.confidence.hots,
                difficulty_confidence: aiData.confidence.difficulty,
                boundedness_confidence: aiData.confidence.boundedness,
                full_json_report: aiData,
                model_version: aiData.model_version
            })

        if (reviewError) {
            console.error('Error saving AI review:', reviewError)
            // Non-fatal: still proceed with routing
        }

        // 4. Determine routing (auto-approve or admin queue)
        const routingInput: RoutingInput = {
            aiResult: aiData,
            teacherDifficulty: teacher_difficulty,
            teacherHotsClaim: teacher_hots_claim
        }

        const routingDecision = determineRouting(routingInput)

        // 5. Update question status based on routing
        const newStatus = routingDecision.action === 'auto_approve'
            ? 'approved'
            : 'admin_review'

        await supabase
            .from(tableName)
            .update({ status: newStatus })
            .eq('id', question_id)

        // 6. Return response
        return NextResponse.json({
            success: true,
            status: newStatus,
            analysis: {
                bloom_level: aiData.primary_bloom_level,
                hots: aiData.hots,
                boundedness: aiData.boundedness,
                difficulty: aiData.difficulty,
                quality: aiData.quality,
                confidence: aiData.confidence
            },
            routing: {
                action: routingDecision.action,
                reasons: routingDecision.reasons,
                priority: routingDecision.priority
            }
        })

    } catch (error: any) {
        console.error('HOTS analyze error:', error)
        return NextResponse.json(
            { error: error?.message || 'Server error' },
            { status: 500 }
        )
    }
}
