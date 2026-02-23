/**
 * HOTS Analysis Trigger
 * 
 * Fire-and-forget helper to trigger AI HOTS analysis after saving questions.
 * This runs asynchronously so it doesn't block the save response.
 */

import { analyzeQuestion, type HOTSAnalysisInput } from '@/lib/hotsQC'
import { determineRouting } from '@/lib/routingRules'
import { supabase } from '@/lib/supabase'

export interface TriggerHOTSInput {
    questionId: string
    questionSource: 'bank' | 'quiz' | 'exam'
    questionText: string
    questionType: string
    options?: string[] | null
    correctAnswer?: string | null
    teacherDifficulty?: string
    teacherHotsClaim?: boolean
    subjectName?: string
    gradeBand?: string
}

/**
 * Trigger HOTS analysis for a single question (fire-and-forget)
 * This updates the question status and saves the AI review in the background.
 */
export async function triggerHOTSAnalysis(input: TriggerHOTSInput): Promise<void> {
    const tableName = input.questionSource === 'bank' ? 'question_bank'
        : input.questionSource === 'quiz' ? 'quiz_questions'
            : 'exam_questions'

    try {
        // 1. Set status to 'ai_reviewing'
        await supabase
            .from(tableName)
            .update({ status: 'ai_reviewing' })
            .eq('id', input.questionId)

        // 2. Run AI analysis
        const analysisInput: HOTSAnalysisInput = {
            question_text: input.questionText,
            question_type: input.questionType,
            options: input.options || null,
            correct_answer: input.correctAnswer || null,
            teacher_difficulty: input.teacherDifficulty,
            teacher_hots_claim: input.teacherHotsClaim || false,
            subject_name: input.subjectName,
            grade_band: input.gradeBand
        }

        const result = await analyzeQuestion(analysisInput)

        if (!result.success || !result.data) {
            console.error(`HOTS analysis failed for ${input.questionSource}/${input.questionId}:`, result.error)
            // Revert to draft on failure
            await supabase
                .from(tableName)
                .update({ status: 'draft' })
                .eq('id', input.questionId)
            return
        }

        const aiData = result.data

        // 3. Save AI review
        await supabase.from('ai_reviews').insert({
            question_source: input.questionSource,
            question_id: input.questionId,
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

        // 4. Determine routing
        const routing = determineRouting({
            aiResult: aiData,
            teacherDifficulty: input.teacherDifficulty,
            teacherHotsClaim: input.teacherHotsClaim
        })

        // 5. Update final status
        const newStatus = routing.action === 'auto_approve' ? 'approved' : 'admin_review'
        await supabase
            .from(tableName)
            .update({ status: newStatus })
            .eq('id', input.questionId)

        // 6. Notify teacher if question needs admin review or is auto-approved
        try {
            let teacherUserId: string | null = null
            if (input.questionSource === 'bank') {
                const { data: q } = await supabase
                    .from('question_bank')
                    .select('teacher:teachers(user_id)')
                    .eq('id', input.questionId)
                    .single()
                teacherUserId = (q as any)?.teacher?.user_id || null
            }

            if (teacherUserId) {
                if (newStatus === 'admin_review') {
                    await supabase.from('notifications').insert({
                        user_id: teacherUserId,
                        type: 'HOTS_REVIEW',
                        title: '🤖 Analisis AI selesai — soal perlu review admin',
                        message: `Soal Anda telah dianalisis AI dan diteruskan ke admin untuk review. Alasan: ${routing.reasons?.join(', ') || 'Perlu verifikasi manual'}`,
                        link: '/dashboard/guru/bank-soal'
                    })
                }
                // Don't notify on auto_approve to avoid noise
            }
        } catch (notifErr) {
            console.error('Notification error:', notifErr)
        }

        console.log(`HOTS analysis complete for ${input.questionSource}/${input.questionId}: ${newStatus}`)

    } catch (error) {
        console.error(`HOTS analysis error for ${input.questionSource}/${input.questionId}:`, error)
        // Revert to approved on error (don't block question usage)
        await supabase
            .from(tableName)
            .update({ status: 'approved' })
            .eq('id', input.questionId)
    }
}

/**
 * Trigger HOTS analysis for multiple questions (fire-and-forget).
 * Processes each question individually and in parallel (max 3 concurrent).
 */
export function triggerBulkHOTSAnalysis(questions: TriggerHOTSInput[]): void {
    // Fire and forget — don't await
    processBulk(questions).catch(err => {
        console.error('Bulk HOTS analysis error:', err)
    })
}

async function processBulk(questions: TriggerHOTSInput[]): Promise<void> {
    // Process in batches of 3 to avoid overloading the API
    const batchSize = 3
    for (let i = 0; i < questions.length; i += batchSize) {
        const batch = questions.slice(i, i + batchSize)
        await Promise.allSettled(batch.map(q => triggerHOTSAnalysis(q)))
    }
}
