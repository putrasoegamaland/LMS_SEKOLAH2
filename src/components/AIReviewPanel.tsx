'use client'

import React from 'react'

/**
 * AIReviewPanel
 * 
 * Reusable component that displays AI HOTS analysis results.
 * Shows Bloom level, HOTS strength, boundedness, difficulty, quality metrics, and suggested edits.
 */

interface AIReview {
    primary_bloom_level: number
    secondary_bloom_levels?: number[]
    hots_flag: boolean
    hots_strength: string
    hots_signals?: string[]
    boundedness: string
    difficulty_score: number
    difficulty_label: string
    difficulty_reasons?: string[]
    clarity_score: number
    ambiguity_flags?: string[]
    missing_info_flags?: string[]
    grade_fit_flags?: string[]
    suggested_edits?: any
    bloom_confidence: number
    hots_confidence: number
    difficulty_confidence: number
    boundedness_confidence: number
    full_json_report?: any
}

interface AIReviewPanelProps {
    review: AIReview | null
    compact?: boolean
}

const BLOOM_LABELS: Record<number, { label: string; color: string }> = {
    1: { label: 'C1 Mengingat', color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
    2: { label: 'C2 Memahami', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
    3: { label: 'C3 Menerapkan', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
    4: { label: 'C4 Menganalisis', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' },
    5: { label: 'C5 Mengevaluasi', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' },
    6: { label: 'C6 Mencipta', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' }
}

const HOTS_LABELS: Record<string, { label: string; color: string }> = {
    S0: { label: 'LOTS', color: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' },
    S1: { label: 'HOTS Moderat', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
    S2: { label: 'HOTS Kuat', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' }
}

const BOUND_LABELS: Record<string, { label: string; color: string; icon: string }> = {
    B0: { label: 'Kurang Jelas', color: 'text-red-500', icon: '🔴' },
    B1: { label: 'Cukup', color: 'text-yellow-500', icon: '🟡' },
    B2: { label: 'Baik', color: 'text-green-500', icon: '🟢' }
}

function ConfidenceBar({ value, label }: { value: number; label: string }) {
    const percent = Math.round(value * 100)
    const barColor = percent >= 80 ? 'bg-green-500' : percent >= 65 ? 'bg-yellow-500' : 'bg-red-500'

    return (
        <div className="flex items-center gap-2 text-xs">
            <span className="w-20 text-text-secondary dark:text-zinc-400 truncate">{label}</span>
            <div className="flex-1 h-1.5 bg-gray-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                <div className={`h-full ${barColor} rounded-full transition-all`} style={{ width: `${percent}%` }} />
            </div>
            <span className="w-8 text-right text-text-secondary dark:text-zinc-400">{percent}%</span>
        </div>
    )
}

export default function AIReviewPanel({ review, compact = false }: AIReviewPanelProps) {
    if (!review) {
        return (
            <div className="text-sm text-text-secondary dark:text-zinc-400 italic px-3 py-2">
                ⏳ Menunggu AI review...
            </div>
        )
    }

    const bloom = BLOOM_LABELS[review.primary_bloom_level] || BLOOM_LABELS[1]
    const hots = HOTS_LABELS[review.hots_strength] || HOTS_LABELS['S0']
    const bound = BOUND_LABELS[review.boundedness] || BOUND_LABELS['B1']
    const isHOTS = review.primary_bloom_level >= 4

    if (compact) {
        return (
            <div className="flex items-center gap-1.5 flex-wrap">
                <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${bloom.color}`}>
                    {bloom.label}
                </span>
                {isHOTS && (
                    <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${hots.color}`}>
                        {hots.label}
                    </span>
                )}
                <span className="text-xs" title={`Boundedness: ${bound.label}`}>
                    {bound.icon}
                </span>
                <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${review.difficulty_label === 'easy' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
                    review.difficulty_label === 'hard' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' :
                        'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                    }`}>
                    {review.difficulty_label === 'easy' ? 'Mudah' : review.difficulty_label === 'hard' ? 'Sulit' : 'Sedang'}
                </span>
            </div>
        )
    }

    return (
        <div className="space-y-4 p-4 bg-gradient-to-br from-blue-50/50 to-purple-50/50 dark:from-blue-950/20 dark:to-purple-950/20 rounded-xl border border-blue-200/50 dark:border-blue-800/30">
            <div className="flex items-center gap-2 mb-3">
                <span className="text-sm font-bold text-text-main dark:text-white">🤖 AI Quality Review</span>
            </div>

            {/* Routing Reasons (Why is this in admin review?) */}
            {review.full_json_report?.routing?.reasons && review.full_json_report.routing.reasons.length > 0 && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mb-3">
                    <p className="text-xs font-bold text-amber-800 dark:text-amber-400 mb-1">📋 Alasan Masuk Review Admin:</p>
                    <ul className="list-disc list-inside space-y-0.5">
                        {review.full_json_report.routing.reasons.map((r: string, idx: number) => (
                            <li key={idx} className="text-xs text-amber-700 dark:text-amber-300">
                                {r}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Main Badges Row */}
            <div className="flex flex-wrap gap-2">
                <span className={`px-3 py-1 text-sm rounded-lg font-semibold ${bloom.color}`}>
                    {bloom.label}
                </span>
                <span className={`px-3 py-1 text-sm rounded-lg font-semibold ${hots.color}`}>
                    {hots.label}
                </span>
                <span className={`px-3 py-1 text-sm rounded-lg font-semibold ${review.difficulty_label === 'easy' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
                    review.difficulty_label === 'hard' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' :
                        'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                    }`}>
                    {review.difficulty_label === 'easy' ? '😊 Mudah' : review.difficulty_label === 'hard' ? '🔥 Sulit' : '📘 Sedang'} ({review.difficulty_score}/10)
                </span>
            </div>

            {/* Boundedness + Clarity */}
            <div className="grid grid-cols-2 gap-3">
                <div className="text-sm">
                    <span className="text-text-secondary dark:text-zinc-400">Boundedness: </span>
                    <span className={`font-medium ${bound.color}`}>{bound.icon} {bound.label}</span>
                </div>
                <div className="text-sm">
                    <span className="text-text-secondary dark:text-zinc-400">Clarity: </span>
                    <span className="font-medium text-text-main dark:text-white">{review.clarity_score}/100</span>
                </div>
            </div>

            {/* HOTS Signals */}
            {review.hots_signals && review.hots_signals.length > 0 && (
                <div>
                    <p className="text-xs font-bold text-text-secondary dark:text-zinc-400 mb-1">HOTS Signals:</p>
                    <div className="flex flex-wrap gap-1">
                        {review.hots_signals.map((signal, i) => (
                            <span key={i} className="px-2 py-0.5 text-xs bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 rounded-md">
                                {signal}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* Flags */}
            {((review.ambiguity_flags && review.ambiguity_flags.length > 0) ||
                (review.missing_info_flags && review.missing_info_flags.length > 0) ||
                (review.grade_fit_flags && review.grade_fit_flags.length > 0)) && (
                    <div className="space-y-1">
                        <p className="text-xs font-bold text-red-500">⚠️ Masalah Terdeteksi:</p>
                        {review.ambiguity_flags?.map((flag, i) => (
                            <p key={`amb-${i}`} className="text-xs text-red-600 dark:text-red-400 pl-4">
                                • Ambigu: {flag}
                            </p>
                        ))}
                        {review.missing_info_flags?.map((flag, i) => (
                            <p key={`miss-${i}`} className="text-xs text-red-600 dark:text-red-400 pl-4">
                                • Info Kurang: {flag}
                            </p>
                        ))}
                        {review.grade_fit_flags?.map((flag, i) => (
                            <p key={`grade-${i}`} className="text-xs text-orange-600 dark:text-orange-400 pl-4">
                                • Level: {flag}
                            </p>
                        ))}
                    </div>
                )}

            {/* Suggested Edits */}
            {review.suggested_edits && Array.isArray(review.suggested_edits) && review.suggested_edits.length > 0 && (
                <div>
                    <p className="text-xs font-bold text-text-secondary dark:text-zinc-400 mb-1">💡 Saran Edit:</p>
                    {review.suggested_edits.map((edit: any, i: number) => (
                        <div key={i} className="text-xs p-2 bg-white/50 dark:bg-zinc-800/50 rounded-lg mb-1">
                            <p className="font-medium text-text-main dark:text-white mb-1">{edit.change_summary}</p>
                            {edit.before && (
                                <p className="text-red-500 line-through">❌ {edit.before}</p>
                            )}
                            {edit.after && (
                                <p className="text-green-600 dark:text-green-400">✅ {edit.after}</p>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Confidence Bars */}
            <div>
                <p className="text-xs font-bold text-text-secondary dark:text-zinc-400 mb-2">Confidence AI:</p>
                <div className="space-y-1">
                    <ConfidenceBar value={review.bloom_confidence} label="Bloom" />
                    <ConfidenceBar value={review.hots_confidence} label="HOTS" />
                    <ConfidenceBar value={review.difficulty_confidence} label="Difficulty" />
                    <ConfidenceBar value={review.boundedness_confidence} label="Bounded" />
                </div>
            </div>
        </div>
    )
}
