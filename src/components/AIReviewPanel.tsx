'use client'

import React from 'react'

/**
 * AIReviewPanel
 * 
 * Reusable component that displays AI HOTS analysis results.
 * Shows clear verdict, score grid, quality metrics, and suggested edits.
 * All labels in Indonesian for teacher/admin clarity.
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

const BLOOM_LABELS: Record<number, { label: string; shortLabel: string; color: string; emoji: string }> = {
    1: { label: 'C1 Mengingat', shortLabel: 'C1', color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300', emoji: '🔵' },
    2: { label: 'C2 Memahami', shortLabel: 'C2', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300', emoji: '🟢' },
    3: { label: 'C3 Menerapkan', shortLabel: 'C3', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300', emoji: '🟡' },
    4: { label: 'C4 Menganalisis', shortLabel: 'C4', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300', emoji: '🟠' },
    5: { label: 'C5 Mengevaluasi', shortLabel: 'C5', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300', emoji: '🔴' },
    6: { label: 'C6 Mencipta', shortLabel: 'C6', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300', emoji: '🟣' }
}

const HOTS_LABELS: Record<string, { label: string; shortLabel: string; color: string; bgColor: string }> = {
    S0: { label: 'LOTS (Berpikir Tingkat Rendah)', shortLabel: 'LOTS', color: 'text-gray-600 dark:text-gray-400', bgColor: 'bg-gray-100 dark:bg-gray-800' },
    S1: { label: 'HOTS Moderat', shortLabel: 'HOTS Moderat', color: 'text-amber-700 dark:text-amber-300', bgColor: 'bg-amber-100 dark:bg-amber-900/30' },
    S2: { label: 'HOTS Kuat', shortLabel: 'HOTS Kuat', color: 'text-emerald-700 dark:text-emerald-300', bgColor: 'bg-emerald-100 dark:bg-emerald-900/30' }
}

const BOUND_LABELS: Record<string, { label: string; color: string; icon: string; bgColor: string }> = {
    B0: { label: 'Kurang Jelas', color: 'text-red-600 dark:text-red-400', bgColor: 'bg-red-50 dark:bg-red-900/20', icon: '🔴' },
    B1: { label: 'Cukup Jelas', color: 'text-amber-600 dark:text-amber-400', bgColor: 'bg-amber-50 dark:bg-amber-900/20', icon: '🟡' },
    B2: { label: 'Sangat Jelas', color: 'text-green-600 dark:text-green-400', bgColor: 'bg-green-50 dark:bg-green-900/20', icon: '🟢' }
}

const DIFF_LABELS: Record<string, { label: string; emoji: string; color: string; bgColor: string }> = {
    easy: { label: 'Mudah', emoji: '😊', color: 'text-green-700 dark:text-green-300', bgColor: 'bg-green-100 dark:bg-green-900/30' },
    medium: { label: 'Sedang', emoji: '📘', color: 'text-blue-700 dark:text-blue-300', bgColor: 'bg-blue-100 dark:bg-blue-900/30' },
    hard: { label: 'Sulit', emoji: '🔥', color: 'text-red-700 dark:text-red-300', bgColor: 'bg-red-100 dark:bg-red-900/30' }
}

function getVerdict(review: AIReview): { label: string; color: string; bgColor: string; borderColor: string } {
    const hasFlags = (review.ambiguity_flags?.length || 0) > 0 ||
        (review.missing_info_flags?.length || 0) > 0 ||
        (review.grade_fit_flags?.length || 0) > 0
    const lowConf = Math.min(review.bloom_confidence, review.hots_confidence, review.difficulty_confidence, review.boundedness_confidence) < 0.65
    const badBound = review.boundedness === 'B0'

    if (hasFlags || badBound) {
        return { label: '❌ Perlu Perbaikan', color: 'text-red-700 dark:text-red-300', bgColor: 'bg-red-50 dark:bg-red-900/20', borderColor: 'border-red-200 dark:border-red-800' }
    }
    if (lowConf || review.hots_strength === 'S0') {
        return { label: '⚠️ Perlu Perhatian', color: 'text-amber-700 dark:text-amber-300', bgColor: 'bg-amber-50 dark:bg-amber-900/20', borderColor: 'border-amber-200 dark:border-amber-800' }
    }
    return { label: '✅ Kualitas Baik', color: 'text-emerald-700 dark:text-emerald-300', bgColor: 'bg-emerald-50 dark:bg-emerald-900/20', borderColor: 'border-emerald-200 dark:border-emerald-800' }
}

function ConfidenceBar({ value, label }: { value: number; label: string }) {
    const percent = Math.round(value * 100)
    const barColor = percent >= 80 ? 'bg-emerald-500' : percent >= 65 ? 'bg-amber-500' : 'bg-red-500'
    const textColor = percent >= 80 ? 'text-emerald-600 dark:text-emerald-400' : percent >= 65 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'

    return (
        <div className="text-xs">
            <div className="flex items-center justify-between mb-0.5">
                <span className="text-text-secondary dark:text-zinc-400 font-medium">{label}</span>
                <span className={`font-semibold ${textColor}`}>{percent}% yakin</span>
            </div>
            <div className="h-2 bg-gray-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                <div className={`h-full ${barColor} rounded-full transition-all`} style={{ width: `${percent}%` }} />
            </div>
        </div>
    )
}

export default function AIReviewPanel({ review, compact = false }: AIReviewPanelProps) {
    if (!review) {
        return (
            <div className="text-sm text-text-secondary dark:text-zinc-400 italic px-3 py-2">
                ⏳ Menunggu analisis AI...
            </div>
        )
    }

    const bloom = BLOOM_LABELS[review.primary_bloom_level] || BLOOM_LABELS[1]
    const hots = HOTS_LABELS[review.hots_strength] || HOTS_LABELS['S0']
    const bound = BOUND_LABELS[review.boundedness] || BOUND_LABELS['B1']
    const diff = DIFF_LABELS[review.difficulty_label?.toLowerCase()] || DIFF_LABELS['medium']
    const verdict = getVerdict(review)

    // ========== COMPACT MODE (for admin inline) ==========
    if (compact) {
        return (
            <div className="flex items-center gap-1.5 flex-wrap">
                {/* Bloom */}
                <span className={`px-2 py-0.5 text-xs rounded-full font-semibold ${bloom.color}`}>
                    {bloom.emoji} {bloom.shortLabel}
                </span>
                {/* HOTS Strength */}
                <span className={`px-2 py-0.5 text-xs rounded-full font-semibold ${hots.bgColor} ${hots.color}`}>
                    {review.hots_strength === 'S2' ? '🧠' : review.hots_strength === 'S1' ? '💡' : '📝'} {hots.shortLabel}
                </span>
                {/* Difficulty with score */}
                <span className={`px-2 py-0.5 text-xs rounded-full font-semibold ${diff.bgColor} ${diff.color}`}>
                    {diff.emoji} {diff.label} ({review.difficulty_score}/10)
                </span>
                {/* Boundedness */}
                <span className={`px-2 py-0.5 text-xs rounded-full font-semibold ${bound.bgColor} ${bound.color}`}>
                    {bound.icon} {bound.label}
                </span>
                {/* Clarity score */}
                <span className="px-2 py-0.5 text-xs rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 font-medium">
                    Kejelasan: {review.clarity_score}/100
                </span>
            </div>
        )
    }

    // ========== FULL MODE ==========
    return (
        <div className="space-y-3 p-4 bg-gradient-to-br from-blue-50/50 to-purple-50/50 dark:from-blue-950/20 dark:to-purple-950/20 rounded-xl border border-blue-200/50 dark:border-blue-800/30">
            {/* Header + Verdict Banner */}
            <div className={`flex items-center justify-between p-3 rounded-lg border ${verdict.bgColor} ${verdict.borderColor}`}>
                <div className="flex items-center gap-2">
                    <span className="text-lg">🤖</span>
                    <span className="text-sm font-bold text-text-main dark:text-white">Analisis Kualitas AI</span>
                </div>
                <span className={`text-sm font-bold ${verdict.color}`}>{verdict.label}</span>
            </div>

            {/* Score Grid — 4 columns */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {/* Bloom Level */}
                <div className="bg-white dark:bg-zinc-800 rounded-lg p-3 border border-gray-100 dark:border-zinc-700 text-center">
                    <p className="text-2xl font-bold text-text-main dark:text-white">{bloom.emoji}</p>
                    <p className={`text-sm font-bold mt-1 ${bloom.color.includes('text-') ? bloom.color.split(' ').find(c => c.startsWith('text-')) || '' : ''}`}>
                        {bloom.label}
                    </p>
                    <p className="text-[10px] text-text-secondary dark:text-zinc-500 mt-0.5">Level Bloom</p>
                </div>
                {/* HOTS Strength */}
                <div className="bg-white dark:bg-zinc-800 rounded-lg p-3 border border-gray-100 dark:border-zinc-700 text-center">
                    <p className="text-2xl font-bold">{review.hots_strength === 'S2' ? '🧠' : review.hots_strength === 'S1' ? '💡' : '📝'}</p>
                    <p className={`text-sm font-bold mt-1 ${hots.color}`}>
                        {hots.shortLabel}
                    </p>
                    <p className="text-[10px] text-text-secondary dark:text-zinc-500 mt-0.5">Kekuatan HOTS ({review.hots_strength})</p>
                </div>
                {/* Difficulty */}
                <div className="bg-white dark:bg-zinc-800 rounded-lg p-3 border border-gray-100 dark:border-zinc-700 text-center">
                    <p className="text-2xl font-bold">{diff.emoji}</p>
                    <p className={`text-sm font-bold mt-1 ${diff.color}`}>
                        {diff.label} <span className="text-xs font-normal">({review.difficulty_score}/10)</span>
                    </p>
                    <p className="text-[10px] text-text-secondary dark:text-zinc-500 mt-0.5">Tingkat Kesulitan</p>
                </div>
                {/* Boundedness */}
                <div className="bg-white dark:bg-zinc-800 rounded-lg p-3 border border-gray-100 dark:border-zinc-700 text-center">
                    <p className="text-2xl font-bold">{bound.icon}</p>
                    <p className={`text-sm font-bold mt-1 ${bound.color}`}>
                        {bound.label}
                    </p>
                    <p className="text-[10px] text-text-secondary dark:text-zinc-500 mt-0.5">Kejelasan Batasan ({review.boundedness})</p>
                </div>
            </div>

            {/* Clarity Score Bar */}
            <div className="bg-white dark:bg-zinc-800 rounded-lg p-3 border border-gray-100 dark:border-zinc-700">
                <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-text-secondary dark:text-zinc-400">📊 Skor Kejelasan Soal</span>
                    <span className={`text-sm font-bold ${review.clarity_score >= 80 ? 'text-emerald-600 dark:text-emerald-400' : review.clarity_score >= 60 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}`}>
                        {review.clarity_score}/100
                    </span>
                </div>
                <div className="h-2.5 bg-gray-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                    <div
                        className={`h-full rounded-full transition-all ${review.clarity_score >= 80 ? 'bg-emerald-500' : review.clarity_score >= 60 ? 'bg-amber-500' : 'bg-red-500'}`}
                        style={{ width: `${review.clarity_score}%` }}
                    />
                </div>
            </div>

            {/* Routing Reasons */}
            {review.full_json_report?.routing?.reasons && review.full_json_report.routing.reasons.length > 0 && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                    <p className="text-xs font-bold text-amber-800 dark:text-amber-300 mb-1.5 flex items-center gap-1">
                        📋 Alasan Masuk Review Admin:
                    </p>
                    <ul className="space-y-1">
                        {review.full_json_report.routing.reasons.map((r: string, idx: number) => (
                            <li key={idx} className="text-xs text-amber-700 dark:text-amber-300 flex items-start gap-1.5">
                                <span className="mt-0.5 flex-shrink-0">•</span>
                                <span>{r}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Difficulty Reasons */}
            {review.difficulty_reasons && review.difficulty_reasons.length > 0 && (
                <div className="bg-white dark:bg-zinc-800 rounded-lg p-3 border border-gray-100 dark:border-zinc-700">
                    <p className="text-xs font-bold text-text-secondary dark:text-zinc-400 mb-1">📐 Alasan Tingkat Kesulitan:</p>
                    <ul className="space-y-0.5">
                        {review.difficulty_reasons.map((r, i) => (
                            <li key={i} className="text-xs text-text-main dark:text-zinc-300 flex items-start gap-1.5">
                                <span className="mt-0.5 flex-shrink-0">•</span>
                                <span>{r}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* HOTS Signals */}
            {review.hots_signals && review.hots_signals.length > 0 && (
                <div className="bg-white dark:bg-zinc-800 rounded-lg p-3 border border-gray-100 dark:border-zinc-700">
                    <p className="text-xs font-bold text-text-secondary dark:text-zinc-400 mb-1.5">🧠 Sinyal HOTS Terdeteksi:</p>
                    <div className="flex flex-wrap gap-1">
                        {review.hots_signals.map((signal, i) => (
                            <span key={i} className="px-2 py-0.5 text-xs bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 rounded-md border border-emerald-200 dark:border-emerald-800">
                                {signal}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* Quality Flags */}
            {((review.ambiguity_flags && review.ambiguity_flags.length > 0) ||
                (review.missing_info_flags && review.missing_info_flags.length > 0) ||
                (review.grade_fit_flags && review.grade_fit_flags.length > 0)) && (
                    <div className="bg-red-50 dark:bg-red-900/15 border border-red-200 dark:border-red-800 rounded-lg p-3">
                        <p className="text-xs font-bold text-red-700 dark:text-red-300 mb-1.5">⚠️ Masalah Terdeteksi:</p>
                        <div className="space-y-1">
                            {review.ambiguity_flags?.map((flag, i) => (
                                <p key={`amb-${i}`} className="text-xs text-red-600 dark:text-red-400 flex items-start gap-1.5">
                                    <span className="mt-0.5 flex-shrink-0">🔸</span>
                                    <span><strong>Ambigu:</strong> {flag}</span>
                                </p>
                            ))}
                            {review.missing_info_flags?.map((flag, i) => (
                                <p key={`miss-${i}`} className="text-xs text-red-600 dark:text-red-400 flex items-start gap-1.5">
                                    <span className="mt-0.5 flex-shrink-0">🔸</span>
                                    <span><strong>Info Kurang:</strong> {flag}</span>
                                </p>
                            ))}
                            {review.grade_fit_flags?.map((flag, i) => (
                                <p key={`grade-${i}`} className="text-xs text-orange-600 dark:text-orange-400 flex items-start gap-1.5">
                                    <span className="mt-0.5 flex-shrink-0">🔸</span>
                                    <span><strong>Level Kelas:</strong> {flag}</span>
                                </p>
                            ))}
                        </div>
                    </div>
                )}

            {/* Suggested Edits */}
            {review.suggested_edits && Array.isArray(review.suggested_edits) && review.suggested_edits.length > 0 && (
                <div className="bg-white dark:bg-zinc-800 rounded-lg p-3 border border-gray-100 dark:border-zinc-700">
                    <p className="text-xs font-bold text-text-secondary dark:text-zinc-400 mb-1.5">💡 Saran Perbaikan:</p>
                    <div className="space-y-2">
                        {review.suggested_edits.map((edit: any, i: number) => (
                            <div key={i} className="text-xs p-2.5 bg-blue-50/50 dark:bg-blue-900/10 rounded-lg border border-blue-100 dark:border-blue-900/30">
                                <p className="font-semibold text-text-main dark:text-white mb-1">{edit.change_summary}</p>
                                {edit.before && (
                                    <p className="text-red-500 dark:text-red-400 line-through mt-1">❌ {edit.before}</p>
                                )}
                                {edit.after && (
                                    <p className="text-green-600 dark:text-green-400 mt-0.5">✅ {edit.after}</p>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Confidence Bars */}
            <div className="bg-white dark:bg-zinc-800 rounded-lg p-3 border border-gray-100 dark:border-zinc-700">
                <p className="text-xs font-bold text-text-secondary dark:text-zinc-400 mb-1">🎯 Keyakinan AI terhadap Hasil Analisis:</p>
                <p className="text-[10px] text-text-secondary dark:text-zinc-500 mb-2 italic">
                    Seberapa yakin AI bahwa hasilnya benar (bukan seberapa tinggi nilainya)
                </p>
                <div className="space-y-2">
                    <ConfidenceBar value={review.bloom_confidence} label={`Bloom → ${bloom.label}`} />
                    <ConfidenceBar value={review.hots_confidence} label={`HOTS → ${hots.shortLabel}`} />
                    <ConfidenceBar value={review.difficulty_confidence} label={`Kesulitan → ${diff.label} (${review.difficulty_score}/10)`} />
                    <ConfidenceBar value={review.boundedness_confidence} label={`Batasan → ${bound.label}`} />
                </div>
            </div>
        </div>
    )
}
