'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import AIReviewPanel from '@/components/AIReviewPanel'
import { ArrowLeft, Filter, CheckCircle, RotateCcw, Archive, ChevronDown, ChevronUp, Search, User, BookOpen, Brain, BarChart3, Eye, EyeOff } from 'lucide-react'
import Link from 'next/link'

interface QueueItem {
    id: string
    question_text: string
    question_type: string
    options?: any
    correct_answer?: string
    difficulty?: string
    status: string
    created_at: string
    question_source: string
    teacher_hots_claim?: boolean
    ai_review: any
    subject?: any
    teacher?: any
    quiz?: any
    exam?: any
}

interface TeacherGroup {
    teacherId: string
    teacherName: string
    questions: QueueItem[]
    subjects: string[]
    totalQuestions: number
    avgBloomLevel: number | null
    hotsCount: number
    approvedCount: number
    reviewCount: number
}

export default function ReviewSoalPage() {
    const { user } = useAuth()
    const router = useRouter()
    const [items, setItems] = useState<QueueItem[]>([])
    const [loading, setLoading] = useState(true)
    const [sourceFilter, setSourceFilter] = useState<string>('')
    const [statusFilter, setStatusFilter] = useState<string>('')
    const [search, setSearch] = useState('')
    const [expandedTeacher, setExpandedTeacher] = useState<string | null>(null)
    const [expandedQuestion, setExpandedQuestion] = useState<string | null>(null)
    const [actionLoading, setActionLoading] = useState<string | null>(null)
    const [total, setTotal] = useState(0)
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [notes, setNotes] = useState<Record<string, string>>({})

    useEffect(() => {
        if (user && user.role !== 'ADMIN') {
            router.replace('/dashboard')
        }
    }, [user, router])

    const fetchQueue = useCallback(async () => {
        setLoading(true)
        try {
            let url = `/api/admin/review-queue?page=${page}&limit=100`
            if (sourceFilter) url += `&source=${sourceFilter}`
            if (statusFilter) url += `&status=${statusFilter}`

            const res = await fetch(url)
            const data = await res.json()

            setItems(data.data || [])
            setTotal(data.total || 0)
            setTotalPages(data.totalPages || 1)
        } catch (error) {
            console.error('Error fetching review queue:', error)
        } finally {
            setLoading(false)
        }
    }, [page, sourceFilter, statusFilter])

    useEffect(() => {
        if (user) fetchQueue()
    }, [user, fetchQueue])

    const handleAction = async (item: QueueItem, decision: 'approve' | 'return' | 'archive') => {
        setActionLoading(item.id)
        try {
            const res = await fetch('/api/admin/review-queue', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    question_id: item.id,
                    question_source: item.question_source,
                    decision,
                    notes: notes[item.id] || ''
                })
            })

            if (res.ok) {
                fetchQueue()
            } else {
                alert('Gagal memproses review')
            }
        } catch (error) {
            console.error('Error processing review:', error)
            alert('Terjadi kesalahan')
        } finally {
            setActionLoading(null)
        }
    }

    // ---- Helpers ----

    const getTeacherName = (item: QueueItem): string => {
        if (item.teacher?.user?.full_name) return item.teacher.user.full_name
        const ta = item.quiz?.teaching_assignment || item.exam?.teaching_assignment
        return ta?.teacher?.user?.full_name || 'Guru Tidak Diketahui'
    }

    const getTeacherId = (item: QueueItem): string => {
        if (item.teacher?.id) return item.teacher.id
        const ta = item.quiz?.teaching_assignment || item.exam?.teaching_assignment
        return ta?.teacher?.id || 'unknown'
    }

    const getSubjectName = (item: QueueItem): string => {
        if (item.subject?.name) return item.subject.name
        const ta = item.quiz?.teaching_assignment || item.exam?.teaching_assignment
        return ta?.subject?.name || '-'
    }

    const getClassName = (item: QueueItem): string => {
        const ta = item.quiz?.teaching_assignment || item.exam?.teaching_assignment
        return ta?.class?.name || ''
    }

    const getSourceLabel = (source: string): string => {
        switch (source) {
            case 'bank': return 'Bank Soal'
            case 'quiz': return 'Kuis'
            case 'exam': return 'Ulangan'
            default: return source
        }
    }

    const getSourceBadge = (source: string) => {
        const colors: Record<string, string> = {
            bank: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
            quiz: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
            exam: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300'
        }
        return <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${colors[source] || 'bg-gray-100 text-gray-600'}`}>{getSourceLabel(source)}</span>
    }

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'approved': return <span className="px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 font-medium">✅ Approved</span>
            case 'ai_reviewing': return <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 font-medium animate-pulse">🤖 AI Review...</span>
            case 'admin_review': return <span className="px-2 py-0.5 text-xs rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 font-medium">⚠️ Perlu Review</span>
            case 'returned': return <span className="px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 font-medium">❌ Dikembalikan</span>
            case 'draft': return <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 font-medium">📝 Draft</span>
            default: return <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 font-medium">{status || '-'}</span>
        }
    }

    const getDifficultyBadge = (difficulty?: string) => {
        switch (difficulty) {
            case 'EASY': return <span className="px-1.5 py-0.5 text-xs rounded bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400">Mudah</span>
            case 'MEDIUM': return <span className="px-1.5 py-0.5 text-xs rounded bg-yellow-50 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-400">Sedang</span>
            case 'HARD': return <span className="px-1.5 py-0.5 text-xs rounded bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400">Sulit</span>
            default: return null
        }
    }

    // ---- Group by Teacher ----

    const filteredItems = search
        ? items.filter(i => i.question_text.toLowerCase().includes(search.toLowerCase()))
        : items

    const teacherGroups: TeacherGroup[] = (() => {
        const groupMap = new Map<string, TeacherGroup>()

        filteredItems.forEach(item => {
            const teacherId = getTeacherId(item)
            const teacherName = getTeacherName(item)

            if (!groupMap.has(teacherId)) {
                groupMap.set(teacherId, {
                    teacherId,
                    teacherName,
                    questions: [],
                    subjects: [],
                    totalQuestions: 0,
                    avgBloomLevel: null,
                    hotsCount: 0,
                    approvedCount: 0,
                    reviewCount: 0
                })
            }

            const group = groupMap.get(teacherId)!
            group.questions.push(item)
            group.totalQuestions++

            const subject = getSubjectName(item)
            if (subject !== '-' && !group.subjects.includes(subject)) {
                group.subjects.push(subject)
            }

            if (item.status === 'approved') group.approvedCount++
            if (item.status === 'admin_review') group.reviewCount++
            if (item.ai_review?.hots_flag) group.hotsCount++
        })

        // Calculate avg bloom level
        groupMap.forEach(group => {
            const bloomLevels = group.questions
                .filter(q => q.ai_review?.primary_bloom_level)
                .map(q => q.ai_review.primary_bloom_level)
            if (bloomLevels.length > 0) {
                group.avgBloomLevel = Math.round((bloomLevels.reduce((a: number, b: number) => a + b, 0) / bloomLevels.length) * 10) / 10
            }
        })

        return Array.from(groupMap.values()).sort((a, b) => b.totalQuestions - a.totalQuestions)
    })()

    // ---- Stats ----
    const totalAnalyzed = items.filter(i => i.ai_review).length
    const totalHots = items.filter(i => i.ai_review?.hots_flag).length
    const totalNeedReview = items.filter(i => i.status === 'admin_review').length

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Link href="/dashboard/admin">
                        <Button variant="ghost" icon={<ArrowLeft className="w-4 h-4" />} />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-text-main dark:text-white">Review Soal</h1>
                        <p className="text-sm text-text-secondary dark:text-zinc-400">
                            Pantau dan review kualitas soal dari semua guru
                        </p>
                    </div>
                </div>
            </div>

            {/* Overview Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Card className="p-4 text-center">
                    <p className="text-2xl font-bold text-text-main dark:text-white">{total}</p>
                    <p className="text-xs text-text-secondary dark:text-zinc-400 mt-1">Total Soal</p>
                </Card>
                <Card className="p-4 text-center">
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{totalAnalyzed}</p>
                    <p className="text-xs text-text-secondary dark:text-zinc-400 mt-1">Sudah Dianalisis AI</p>
                </Card>
                <Card className="p-4 text-center">
                    <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{totalHots}</p>
                    <p className="text-xs text-text-secondary dark:text-zinc-400 mt-1">Soal HOTS</p>
                </Card>
                <Card className="p-4 text-center">
                    <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{totalNeedReview}</p>
                    <p className="text-xs text-text-secondary dark:text-zinc-400 mt-1">Perlu Review</p>
                </Card>
            </div>

            {/* Filters */}
            <Card className="p-4">
                <div className="flex flex-wrap gap-3 items-center">
                    <div className="flex items-center gap-1">
                        <Filter className="w-4 h-4 text-text-secondary dark:text-zinc-400" />
                        <span className="text-sm text-text-secondary dark:text-zinc-400">Sumber:</span>
                    </div>
                    {['', 'bank', 'quiz', 'exam'].map(src => (
                        <button
                            key={src || 'all'}
                            onClick={() => { setSourceFilter(src); setPage(1) }}
                            className={`px-3 py-1 text-sm rounded-lg transition-colors ${sourceFilter === src
                                ? 'bg-primary text-white shadow-sm'
                                : 'bg-secondary/10 text-text-main dark:text-zinc-300 hover:bg-secondary/20'
                                }`}
                        >
                            {src === '' ? 'Semua' : src === 'bank' ? 'Bank Soal' : src === 'quiz' ? 'Kuis' : 'Ulangan'}
                        </button>
                    ))}
                    <div className="border-l dark:border-zinc-600 h-6 mx-1" />
                    <span className="text-sm text-text-secondary dark:text-zinc-400">Status:</span>
                    {[{ v: '', l: 'Semua' }, { v: 'approved', l: '✅' }, { v: 'admin_review', l: '⚠️' }, { v: 'returned', l: '❌' }, { v: 'draft', l: '📝' }].map(s => (
                        <button
                            key={s.v || 'all-status'}
                            onClick={() => { setStatusFilter(s.v); setPage(1) }}
                            className={`px-3 py-1 text-sm rounded-lg transition-colors ${statusFilter === s.v
                                ? 'bg-primary text-white shadow-sm'
                                : 'bg-secondary/10 text-text-main dark:text-zinc-300 hover:bg-secondary/20'
                                }`}
                        >
                            {s.l}
                        </button>
                    ))}
                    <div className="flex-1" />
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
                        <input
                            type="text"
                            placeholder="Cari soal..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="pl-9 pr-4 py-1.5 text-sm border rounded-lg bg-white dark:bg-zinc-800 dark:border-zinc-700 dark:text-white w-48"
                        />
                    </div>
                </div>
            </Card>

            {/* Teacher Groups */}
            {loading ? (
                <div className="text-center py-12">
                    <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-3" />
                    <p className="text-text-secondary dark:text-zinc-400">Memuat soal...</p>
                </div>
            ) : teacherGroups.length === 0 ? (
                <Card className="p-12 text-center">
                    <p className="text-4xl mb-3">📭</p>
                    <p className="text-lg font-medium text-text-main dark:text-white">Belum ada soal</p>
                    <p className="text-sm text-text-secondary dark:text-zinc-400 mt-1">
                        Belum ada soal yang dibuat oleh guru{statusFilter ? ` dengan status "${statusFilter}"` : ''}.
                    </p>
                </Card>
            ) : (
                <div className="space-y-4">
                    {teacherGroups.map(group => (
                        <Card key={group.teacherId} className="overflow-hidden" padding="">
                            {/* Teacher Header */}
                            <div
                                className="p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors"
                                onClick={() => setExpandedTeacher(expandedTeacher === group.teacherId ? null : group.teacherId)}
                            >
                                <div className="flex items-center gap-4">
                                    {/* Avatar */}
                                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                        <User className="w-6 h-6 text-primary" />
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-semibold text-text-main dark:text-white text-lg">
                                            {group.teacherName}
                                        </h3>
                                        <div className="flex flex-wrap gap-2 mt-1">
                                            {group.subjects.map(subj => (
                                                <span key={subj} className="px-2 py-0.5 text-xs rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-300 font-medium">
                                                    <BookOpen className="w-3 h-3 inline mr-1" />{subj}
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Quick Stats */}
                                    <div className="flex items-center gap-4 flex-shrink-0 text-center">
                                        <div>
                                            <p className="text-lg font-bold text-text-main dark:text-white">{group.totalQuestions}</p>
                                            <p className="text-xs text-text-secondary dark:text-zinc-400">Soal</p>
                                        </div>
                                        {group.avgBloomLevel !== null && (
                                            <div>
                                                <p className="text-lg font-bold text-purple-600 dark:text-purple-400">{group.avgBloomLevel}</p>
                                                <p className="text-xs text-text-secondary dark:text-zinc-400">Avg Bloom</p>
                                            </div>
                                        )}
                                        <div>
                                            <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{group.hotsCount}</p>
                                            <p className="text-xs text-text-secondary dark:text-zinc-400">HOTS</p>
                                        </div>
                                        {group.reviewCount > 0 && (
                                            <div>
                                                <p className="text-lg font-bold text-amber-600 dark:text-amber-400">{group.reviewCount}</p>
                                                <p className="text-xs text-text-secondary dark:text-zinc-400">Review</p>
                                            </div>
                                        )}
                                        <div className="flex-shrink-0">
                                            {expandedTeacher === group.teacherId
                                                ? <ChevronUp className="w-5 h-5 text-text-secondary" />
                                                : <ChevronDown className="w-5 h-5 text-text-secondary" />
                                            }
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Expanded: Question list */}
                            {expandedTeacher === group.teacherId && (
                                <div className="border-t dark:border-zinc-700">
                                    {group.questions.map((item, idx) => (
                                        <div key={item.id} className={`${idx > 0 ? 'border-t dark:border-zinc-700/50' : ''}`}>
                                            {/* Question Row */}
                                            <div
                                                className="px-4 py-3 cursor-pointer hover:bg-gray-50/80 dark:hover:bg-zinc-800/30 transition-colors"
                                                onClick={() => setExpandedQuestion(expandedQuestion === item.id ? null : item.id)}
                                            >
                                                <div className="flex items-start gap-3">
                                                    <span className="text-xs text-text-secondary dark:text-zinc-500 mt-1 font-mono w-6 text-right flex-shrink-0">
                                                        {idx + 1}.
                                                    </span>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm text-text-main dark:text-white line-clamp-2">
                                                            {item.question_text}
                                                        </p>
                                                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                                                            {getSourceBadge(item.question_source)}
                                                            {getStatusBadge(item.status)}
                                                            {getDifficultyBadge(item.difficulty)}
                                                            <span className="px-1.5 py-0.5 text-xs rounded bg-gray-50 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                                                                {item.question_type === 'MULTIPLE_CHOICE' ? 'PG' : 'Essay'}
                                                            </span>
                                                            {item.teacher_hots_claim && (
                                                                <span className="px-1.5 py-0.5 text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 rounded font-medium">
                                                                    🏷️ Klaim HOTS
                                                                </span>
                                                            )}
                                                            {item.ai_review && (
                                                                <span className="px-1.5 py-0.5 text-xs bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-300 rounded">
                                                                    <Brain className="w-3 h-3 inline mr-0.5" />
                                                                    Bloom L{item.ai_review.primary_bloom_level}
                                                                    {item.ai_review.hots_flag && ' • HOTS'}
                                                                </span>
                                                            )}
                                                            {getClassName(item) && (
                                                                <span className="px-1.5 py-0.5 text-xs rounded bg-gray-50 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                                                                    {getClassName(item)}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="flex-shrink-0 text-xs text-text-secondary dark:text-zinc-500">
                                                        {new Date(item.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Expanded Question Detail */}
                                            {expandedQuestion === item.id && (
                                                <div className="px-4 pb-4 pt-2 ml-9 space-y-4 bg-gray-50/50 dark:bg-zinc-900/30 rounded-b-lg">
                                                    {/* Full Question */}
                                                    <div>
                                                        <h4 className="text-xs font-bold text-text-secondary dark:text-zinc-400 mb-1 uppercase tracking-wide">Soal Lengkap</h4>
                                                        <p className="text-sm text-text-main dark:text-white whitespace-pre-wrap bg-white dark:bg-zinc-800 p-3 rounded-lg border dark:border-zinc-700">
                                                            {item.question_text}
                                                        </p>
                                                        {item.options && Array.isArray(item.options) && (
                                                            <div className="mt-2 space-y-1 pl-3">
                                                                {item.options.map((opt: string, i: number) => (
                                                                    <p key={i} className={`text-sm ${opt === item.correct_answer
                                                                        ? 'text-green-600 dark:text-green-400 font-medium'
                                                                        : 'text-text-main dark:text-zinc-300'
                                                                        }`}>
                                                                        {String.fromCharCode(65 + i)}. {opt}
                                                                        {opt === item.correct_answer && ' ✓'}
                                                                    </p>
                                                                ))}
                                                            </div>
                                                        )}
                                                        {item.correct_answer && !item.options && (
                                                            <div className="mt-2 pl-3">
                                                                <span className="text-xs text-text-secondary dark:text-zinc-400">Jawaban: </span>
                                                                <span className="text-sm text-green-600 dark:text-green-400">{item.correct_answer}</span>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* AI Review */}
                                                    {item.ai_review ? (
                                                        <div>
                                                            <h4 className="text-xs font-bold text-text-secondary dark:text-zinc-400 mb-2 uppercase tracking-wide">
                                                                🤖 Analisis AI
                                                            </h4>
                                                            <AIReviewPanel review={item.ai_review} />
                                                        </div>
                                                    ) : (
                                                        <div className="text-sm text-text-secondary dark:text-zinc-400 italic py-2">
                                                            ℹ️ Belum dianalisis AI. Analisis otomatis berjalan saat soal dibuat.
                                                        </div>
                                                    )}

                                                    {/* Admin Actions */}
                                                    <div className="border-t dark:border-zinc-700 pt-3">
                                                        <div className="flex flex-col sm:flex-row gap-2">
                                                            <textarea
                                                                placeholder="Catatan admin (opsional)..."
                                                                value={notes[item.id] || ''}
                                                                onChange={e => setNotes(prev => ({ ...prev, [item.id]: e.target.value }))}
                                                                className="flex-1 p-2 text-sm border rounded-lg bg-white dark:bg-zinc-800 dark:border-zinc-700 dark:text-white resize-none"
                                                                rows={2}
                                                            />
                                                            <div className="flex gap-2 sm:flex-col">
                                                                <Button
                                                                    onClick={() => handleAction(item, 'approve')}
                                                                    disabled={actionLoading === item.id || item.status === 'approved'}
                                                                    className="!bg-green-600 hover:!bg-green-700 !text-white text-xs flex-1"
                                                                >
                                                                    <CheckCircle className="w-3.5 h-3.5 mr-1" />
                                                                    Approve
                                                                </Button>
                                                                <Button
                                                                    variant="secondary"
                                                                    onClick={() => handleAction(item, 'return')}
                                                                    disabled={actionLoading === item.id}
                                                                    className="!bg-amber-500 hover:!bg-amber-600 !text-white text-xs flex-1"
                                                                >
                                                                    <RotateCcw className="w-3.5 h-3.5 mr-1" />
                                                                    Return
                                                                </Button>
                                                                <Button
                                                                    variant="ghost"
                                                                    onClick={() => handleAction(item, 'archive')}
                                                                    disabled={actionLoading === item.id}
                                                                    className="text-gray-500 text-xs flex-1"
                                                                >
                                                                    <Archive className="w-3.5 h-3.5 mr-1" />
                                                                    Arsip
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </Card>
                    ))}
                </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex justify-center gap-2">
                    <Button
                        variant="ghost"
                        disabled={page <= 1}
                        onClick={() => setPage(p => p - 1)}
                    >
                        ← Sebelumnya
                    </Button>
                    <span className="flex items-center text-sm text-text-secondary dark:text-zinc-400">
                        Halaman {page} dari {totalPages}
                    </span>
                    <Button
                        variant="ghost"
                        disabled={page >= totalPages}
                        onClick={() => setPage(p => p + 1)}
                    >
                        Selanjutnya →
                    </Button>
                </div>
            )}
        </div>
    )
}
