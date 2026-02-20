'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { PageHeader } from '@/components/ui'
import Card from '@/components/ui/Card'
import SmartText from '@/components/SmartText'
import { TickSquare, CloseSquare, TimeCircle, Danger, Calendar, Paper } from 'react-iconly'

interface ExamResult {
    id: string
    total_score: number
    max_score: number
    violation_count: number
    started_at: string
    submitted_at: string
    exam: {
        id: string
        title: string
        duration_minutes: number
        teaching_assignment: {
            subject: { name: string }
            class: { name: string }
        }
    }
}

interface ExamQuestion {
    id: string
    question_text: string
    question_type: string
    options: string[] | null
    correct_answer: string | null
    points: number
    passage_text?: string | null
}

interface ExamAnswer {
    id: string
    question_id: string
    answer: string
    is_correct: boolean
    points_earned: number
}

// Group questions by passage
interface QuestionGroup {
    passage_text: string | null
    questions: { question: ExamQuestion; index: number }[]
}

function groupByPassage(questions: ExamQuestion[]): QuestionGroup[] {
    const groups: QuestionGroup[] = []
    let currentGroup: QuestionGroup | null = null

    questions.forEach((q, idx) => {
        const passage = q.passage_text || null

        if (passage) {
            if (currentGroup && currentGroup.passage_text === passage) {
                currentGroup.questions.push({ question: q, index: idx })
            } else {
                currentGroup = { passage_text: passage, questions: [{ question: q, index: idx }] }
                groups.push(currentGroup)
            }
        } else {
            currentGroup = null
            groups.push({ passage_text: null, questions: [{ question: q, index: idx }] })
        }
    })

    return groups
}

export default function ExamResultPage() {
    const params = useParams()
    const { user } = useAuth()
    const examId = params.id as string
    const [result, setResult] = useState<ExamResult | null>(null)
    const [questions, setQuestions] = useState<ExamQuestion[]>([])
    const [answers, setAnswers] = useState<ExamAnswer[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchResult()
    }, [examId])

    const fetchResult = async () => {
        try {
            // Fetch submission
            const res = await fetch(`/api/exam-submissions?exam_id=${examId}`)
            const data = await res.json()

            if (Array.isArray(data) && data.length > 0) {
                const submission = data[0]
                setResult(submission)

                // Fetch exam questions
                const questionsRes = await fetch(`/api/exams/${examId}/questions`)
                const questionsData = await questionsRes.json()
                if (Array.isArray(questionsData)) {
                    setQuestions(questionsData.sort((a: ExamQuestion, b: ExamQuestion) => a.id.localeCompare(b.id)))
                }

                // Fetch answers for this submission
                const answersRes = await fetch(`/api/exam-submissions/${submission.id}/answers`)
                const answersData = await answersRes.json()
                if (Array.isArray(answersData)) {
                    setAnswers(answersData)
                }
            }
        } catch (error) {
            console.error('Error:', error)
        } finally {
            setLoading(false)
        }
    }

    const formatDuration = (start: string, end: string) => {
        const diff = new Date(end).getTime() - new Date(start).getTime()
        const mins = Math.floor(diff / 60000)
        const secs = Math.floor((diff % 60000) / 1000)
        return `${mins} menit ${secs} detik`
    }

    const getGradeColor = (percentage: number) => {
        if (percentage >= 80) return 'from-green-500 to-emerald-500'
        if (percentage >= 60) return 'from-blue-500 to-cyan-500'
        if (percentage >= 40) return 'from-yellow-500 to-amber-500'
        return 'from-red-500 to-rose-500'
    }

    const getAnswerForQuestion = (qId: string) => {
        return answers.find(a => a.question_id === qId)
    }

    if (loading) {
        return <div className="text-center text-text-secondary py-8">Memuat hasil...</div>
    }

    if (!result) {
        return (
            <div className="text-center text-text-secondary py-8">
                <p>Hasil tidak ditemukan</p>
                <Link href="/dashboard/siswa/ulangan" className="text-primary underline mt-2 inline-block">
                    Kembali
                </Link>
            </div>
        )
    }

    const percentage = Math.round((result.total_score / result.max_score) * 100)
    const questionGroups = groupByPassage(questions)

    const renderQuestion = (q: ExamQuestion, idx: number) => {
        const userAnswer = getAnswerForQuestion(q.id)
        const isCorrect = userAnswer?.is_correct || false

        return (
            <div key={q.id} className="flex items-start gap-4">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${q.question_type === 'MULTIPLE_CHOICE'
                    ? (isCorrect ? 'bg-green-500/20 text-green-600 dark:text-green-400' : 'bg-red-500/20 text-red-600 dark:text-red-400')
                    : 'bg-secondary/20 text-text-secondary'
                    }`}>
                    {q.question_type === 'MULTIPLE_CHOICE' ? (
                        isCorrect ? <TickSquare set="bold" primaryColor="currentColor" size={16} /> : <CloseSquare set="bold" primaryColor="currentColor" size={16} />
                    ) : (
                        idx + 1
                    )}
                </div>
                <div className="flex-1">
                    <SmartText text={q.question_text} className="text-text-main dark:text-white mb-3" />

                    <div className="bg-secondary/10 rounded-lg p-4 text-sm space-y-2">
                        <div>
                            <p className="text-text-secondary text-xs mb-1">Jawaban Kamu:</p>
                            <p className="text-text-main dark:text-white font-medium">
                                {q.question_type === 'MULTIPLE_CHOICE' && q.options && userAnswer?.answer
                                    ? `${userAnswer.answer}. ${q.options[(userAnswer.answer.charCodeAt(0) - 65)] || ''}`
                                    : userAnswer?.answer || '-'}
                            </p>
                        </div>

                        {/* Show correct answer for Multiple Choice if wrong */}
                        {q.question_type === 'MULTIPLE_CHOICE' && !isCorrect && q.correct_answer && (
                            <div className="pt-2 border-t border-secondary/20">
                                <p className="text-green-600 dark:text-green-400 text-xs mb-1">Kunci Jawaban:</p>
                                <p className="text-green-700 dark:text-green-300">
                                    {q.correct_answer}. {q.options?.[(q.correct_answer.charCodeAt(0) || 65) - 65]}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
                <div className="text-right">
                    <span className={`text-sm font-bold ${(userAnswer?.points_earned || 0) === q.points ? 'text-green-600 dark:text-green-400' : 'text-text-secondary'}`}>
                        {userAnswer?.points_earned || 0}/{q.points}
                    </span>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6 max-w-3xl mx-auto">
            <PageHeader
                title="Hasil Ulangan"
                subtitle={result.exam?.title}
                backHref="/dashboard/siswa/ulangan"
            />

            {/* Score Card */}
            <div className={`bg-gradient-to-r ${getGradeColor(percentage)} p-6 rounded-2xl text-white text-center shadow-lg`}>
                <p className="text-lg opacity-90 mb-2 font-medium">{result.exam?.teaching_assignment?.subject?.name}</p>
                <p className="text-6xl font-bold mb-2">{result.total_score}<span className="text-3xl opacity-80">/{result.max_score}</span></p>
                <p className="text-2xl font-bold">{percentage}%</p>
                <p className="mt-4 text-lg font-medium bg-white/20 inline-block px-4 py-1 rounded-full backdrop-blur-sm">
                    {percentage >= 80 ? '🎉 Excellent!' : percentage >= 60 ? '👍 Good Job!' : percentage >= 40 ? '💪 Keep Trying!' : '📚 Need More Study'}
                </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="text-center">
                    <div className="flex justify-center mb-2 text-primary">
                        <TimeCircle set="bold" primaryColor="currentColor" size={24} />
                    </div>
                    <p className="text-lg font-bold text-text-main dark:text-white">
                        {formatDuration(result.started_at, result.submitted_at)}
                    </p>
                    <p className="text-sm text-text-secondary">Waktu Pengerjaan</p>
                </Card>
                <Card className="text-center">
                    <div className="flex justify-center mb-2 text-primary">
                        <Calendar set="bold" primaryColor="currentColor" size={24} />
                    </div>
                    <p className="text-lg font-bold text-text-main dark:text-white">{result.exam?.duration_minutes} menit</p>
                    <p className="text-sm text-text-secondary">Batas Waktu</p>
                </Card>
                <Card className={`text-center ${result.violation_count > 0 ? 'border-red-500/50 bg-red-50 dark:bg-red-900/10' : ''}`}>
                    <div className={`flex justify-center mb-2 ${result.violation_count > 0 ? 'text-red-500' : 'text-green-500'}`}>
                        <Danger set="bold" primaryColor="currentColor" size={24} />
                    </div>
                    <p className={`text-lg font-bold ${result.violation_count > 0 ? 'text-red-500' : 'text-green-500'}`}>{result.violation_count}</p>
                    <p className="text-sm text-text-secondary">Pelanggaran</p>
                </Card>
            </div>

            {/* Completion notice */}
            <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 flex items-center gap-3">
                <span className="text-green-500"><TickSquare set="bold" primaryColor="currentColor" size={32} /></span>
                <div>
                    <p className="text-green-600 dark:text-green-400 font-bold">Ulangan Selesai</p>
                    <p className="text-sm text-text-secondary">Dikumpulkan pada {new Date(result.submitted_at).toLocaleString('id-ID')}</p>
                </div>
            </div>

            {/* Review Jawaban */}
            {questions.length > 0 && (
                <div className="border-t border-secondary/20 pt-8 mt-8">
                    <h3 className="text-xl font-bold text-text-main dark:text-white mb-6">Review Jawaban</h3>
                    <div className="space-y-4">
                        {questionGroups.map((group, groupIdx) => {
                            if (group.passage_text) {
                                return (
                                    <Card key={`passage-${groupIdx}`} className="overflow-hidden">
                                        <div className="bg-indigo-50 dark:bg-indigo-500/10 border-b border-indigo-200 dark:border-indigo-500/20 p-5 -m-6 mb-6 rounded-t-2xl">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="text-indigo-600 dark:text-indigo-400">
                                                    <Paper set="bold" primaryColor="currentColor" size={18} />
                                                </span>
                                                <span className="text-sm font-bold text-indigo-700 dark:text-indigo-300">Bacaan / Passage</span>
                                            </div>
                                            <div className="text-sm text-text-main dark:text-zinc-300 leading-relaxed whitespace-pre-wrap max-h-60 overflow-y-auto pr-2">
                                                <SmartText text={group.passage_text} />
                                            </div>
                                        </div>
                                        <div className="space-y-6 pt-2">
                                            {group.questions.map(({ question, index }) => renderQuestion(question, index))}
                                        </div>
                                    </Card>
                                )
                            } else {
                                const { question, index } = group.questions[0]
                                return (
                                    <Card key={question.id}>
                                        {renderQuestion(question, index)}
                                    </Card>
                                )
                            }
                        })}
                    </div>
                </div>
            )}

            <Link
                href="/dashboard/siswa/ulangan"
                className="block w-full text-center px-6 py-3 bg-primary/10 text-primary-dark dark:text-primary rounded-xl hover:bg-primary/20 transition-colors font-bold"
            >
                ← Kembali ke Daftar Ulangan
            </Link>
        </div>
    )
}
