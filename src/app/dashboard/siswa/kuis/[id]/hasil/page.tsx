'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { PageHeader } from '@/components/ui'
import Card from '@/components/ui/Card'
import SmartText from '@/components/SmartText'

interface QuizResult {
    total_score: number
    max_score: number
    is_graded: boolean
    submitted_at: string
    answers: {
        question_id: string
        answer: string
        score?: number
        feedback?: string
    }[]
}

interface Quiz {
    title: string
    questions: {
        id: string
        question_text: string
        points: number
        question_type: string
        correct_answer?: string
        options?: string[]
    }[]
}

export default function HasilKuisPage() {
    const params = useParams()
    const { user } = useAuth()
    const quizId = params.id as string

    const [result, setResult] = useState<QuizResult | null>(null)
    const [quiz, setQuiz] = useState<Quiz | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Get student ID
                const studentsRes = await fetch('/api/students')
                const students = await studentsRes.json()
                const myStudent = students.find((s: any) => s.user.id === user?.id)

                if (!myStudent) return

                const [quizRes, subRes] = await Promise.all([
                    fetch(`/api/quizzes/${quizId}`),
                    fetch(`/api/quiz-submissions?quiz_id=${quizId}&student_id=${myStudent.id}`)
                ])

                const quizData = await quizRes.json()
                const subData = await subRes.json()

                setQuiz(quizData)
                if (subData && subData.length > 0) {
                    setResult(subData[0])
                }
            } catch (error) {
                console.error('Error fetching result:', error)
            } finally {
                setLoading(false)
            }
        }
        if (user) fetchData()
    }, [user, quizId])

    if (loading) return <div className="text-center text-text-secondary py-8">Memuat hasil...</div>
    if (!result || !quiz) return <div className="text-center text-text-secondary py-8">Hasil tidak ditemukan</div>

    const getAnswerForQuestion = (qId: string) => {
        return result.answers.find(a => a.question_id === qId)
    }

    return (
        <div className="space-y-6 max-w-3xl mx-auto">
            <PageHeader
                title="Hasil Kuis"
                subtitle={quiz.title}
                backHref="/dashboard/siswa/kuis"
            />

            <div className="text-center space-y-4">
                <div className="inline-block p-4 rounded-full bg-primary/10 border border-primary/20 mb-4">
                    <div className="text-6xl">🏆</div>
                </div>
                <h2 className="text-2xl font-bold text-text-main dark:text-white">{quiz.title}</h2>
                <p className="text-text-secondary">Kuis Selesai Dikerjakan</p>

                <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto mt-6">
                    <Card className="text-center">
                        <p className="text-sm text-text-secondary mb-1">Total Skor</p>
                        <p className="text-3xl font-bold text-primary">
                            {result.total_score}
                            <span className="text-sm text-text-secondary font-normal">/{result.max_score}</span>
                        </p>
                    </Card>
                    <Card className="text-center">
                        <p className="text-sm text-text-secondary mb-1">Status</p>
                        <p className={`text-lg font-bold ${result.is_graded ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}`}>
                            {result.is_graded ? 'Selesai Dinilai' : 'Menunggu Koreksi'}
                        </p>
                    </Card>
                </div>
            </div>

            <div className="border-t border-secondary/20 pt-8 mt-8">
                <h3 className="text-xl font-bold text-text-main dark:text-white mb-6">Review Jawaban</h3>
                <div className="space-y-4">
                    {quiz.questions.map((q, idx) => {
                        const userAnswer = getAnswerForQuestion(q.id)
                        const isCorrect = q.question_type === 'MULTIPLE_CHOICE'
                            ? userAnswer?.answer === q.correct_answer
                            : (userAnswer?.score === q.points)

                        return (
                            <Card key={q.id}>
                                <div className="flex items-start gap-4">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${q.question_type === 'MULTIPLE_CHOICE'
                                        ? (isCorrect ? 'bg-green-500/20 text-green-600 dark:text-green-400' : 'bg-red-500/20 text-red-600 dark:text-red-400')
                                        : 'bg-secondary/20 text-text-secondary'
                                        }`}>
                                        {idx + 1}
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

                                            {/* Show correct answer for Multiple Choice only if graded */}
                                            {result.is_graded && q.question_type === 'MULTIPLE_CHOICE' && !isCorrect && (
                                                <div className="pt-2 border-t border-secondary/20">
                                                    <p className="text-green-600 dark:text-green-400 text-xs mb-1">Kunci Jawaban:</p>
                                                    <p className="text-green-700 dark:text-green-300">
                                                        {q.correct_answer}. {q.options?.[(q.correct_answer?.charCodeAt(0) || 65) - 65]}
                                                    </p>
                                                </div>
                                            )}

                                            {/* Feedback for Essay */}
                                            {q.question_type === 'ESSAY' && userAnswer?.feedback && (
                                                <div className="pt-2 border-t border-secondary/20">
                                                    <p className="text-primary text-xs mb-1">Feedback Guru:</p>
                                                    <p className="text-text-main dark:text-white">{userAnswer.feedback}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className={`text-sm font-bold ${q.question_type !== 'MULTIPLE_CHOICE' && !result.is_graded
                                            ? 'text-text-secondary'
                                            : (userAnswer?.score || 0) === q.points ? 'text-green-600 dark:text-green-400' : 'text-text-secondary'
                                            }`}>
                                            {userAnswer?.score || 0}/{q.points}
                                        </span>
                                    </div>
                                </div>
                            </Card>
                        )
                    })}
                </div>
            </div>

            <div className="flex justify-center pt-8 pb-12">
                <Link
                    href="/dashboard/siswa/kuis"
                    className="px-8 py-3 bg-primary text-white rounded-xl hover:bg-primary-dark transition-colors font-semibold"
                >
                    Kembali ke Daftar Kuis
                </Link>
            </div>
        </div>
    )
}
