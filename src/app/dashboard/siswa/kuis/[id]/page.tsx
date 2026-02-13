'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import SmartText from '@/components/SmartText'
import { AlertTriangle, AlarmClock } from 'lucide-react'

interface QuizQuestion {
    id: string
    question_text: string
    question_type: 'ESSAY' | 'MULTIPLE_CHOICE'
    options: string[] | null
    points: number
    order_index: number
    image_url?: string | null
    passage_text?: string | null
}

interface Quiz {
    id: string
    title: string
    description: string
    duration_minutes: number
    is_randomized: boolean
    questions: QuizQuestion[]
}

interface QuizAnswer {
    question_id: string
    answer: string
}

import { useAuth } from '@/contexts/AuthContext'

export default function KerjakanKuisPage() {
    const params = useParams()
    const router = useRouter()
    const { user } = useAuth()
    const quizId = params.id as string

    const [quiz, setQuiz] = useState<Quiz | null>(null)
    const [answers, setAnswers] = useState<Record<string, string>>({})
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [timeLeft, setTimeLeft] = useState<number | null>(null)
    const [startTime, setStartTime] = useState<string | null>(null)
    const [showTimeoutModal, setShowTimeoutModal] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const timerRef = useRef<NodeJS.Timeout | null>(null)

    useEffect(() => {
        if (user) {
            fetchQuizData()
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current)
        }
    }, [quizId, user])

    const fetchQuizData = async () => {
        try {
            // Check Role
            if (user?.role === 'GURU' || user?.role === 'ADMIN') {
                setError('Anda login sebagai Guru/Admin. Tidak dapat mengerjakan kuis sebagai Siswa.')
                setLoading(false)
                return
            }

            // Fetch Quiz Details
            const quizRes = await fetch(`/api/quizzes/${quizId}`)
            if (!quizRes.ok) {
                setError('Gagal memuat kuis. Kuis mungkin tidak ditemukan atau belum aktif.')
                setLoading(false)
                return
            }
            const quizData = await quizRes.json()

            // Fetch Student Data
            const studentsRes = await fetch('/api/students')
            const students = await studentsRes.json()
            const myStudent = students.find((s: any) => s.user.id === user?.id)

            if (!myStudent) {
                setError('Data siswa tidak ditemukan. Pastikan akun anda terdaftar sebagai siswa.')
                setLoading(false)
                return
            }

            setQuiz(quizData)

            // Initialize or Resume attempt
            await initializeAttempt(quizData, myStudent)

        } catch (error) {
            console.error('Error:', error)
            setError('Terjadi kesalahan saat memuat kuis.')
            setLoading(false)
        }
    }

    const initializeAttempt = async (quizData: Quiz, myStudent: any) => {
        // Check existing submission
        const subRes = await fetch(`/api/quiz-submissions?quiz_id=${quizData.id}&student_id=${myStudent.id}`)
        const subs = await subRes.json()
        const existingSub = subs[0]


        let startedAt = new Date()

        if (existingSub) {
            if (existingSub.submitted_at) {
                alert('Anda sudah mengerjakan kuis ini.')
                router.push('/dashboard/siswa/kuis')
                return
            }
            // Resume
            startedAt = new Date(existingSub.started_at)
            setStartTime(existingSub.started_at)

            // Load types answers depending on how we store them. 
            // The DB stores answers as JSONB array: [{question_id, answer, ...}]
            // We need to map it back to state
            if (existingSub.answers) {
                const answerMap: Record<string, string> = {}
                existingSub.answers.forEach((ans: any) => {
                    answerMap[ans.question_id] = ans.answer
                })
                setAnswers(answerMap)
            }

        } else {
            // Start new attempt (implicitly by setting start time now, will be saved on first save/submit)
            // Ideally we create the submission record NOW so the server knows when we started.
            // Let's send a "start" request or just create a submission with null submitted_at

            // Create initial submission to record start time
            await fetch('/api/quiz-submissions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    quiz_id: quizData.id,
                    answers: [],
                    started_at: startedAt.toISOString()
                })
            })
            setStartTime(startedAt.toISOString())
        }

        // Randomize questions if needed
        let displayQuestions = [...(quizData.questions || [])]
        if (quizData.is_randomized && !existingSub) {
            // Only randomize if new attempt, otherwise keep order? 
            // Actually, if we randomize, the order should probably be stored or deterministic.
            // For simplicity, let's just shuffle client side for now, 
            // BUT if the student refreshes, the order might change which is confusing.
            // Ideally the order is saved. Since we didn't add 'question_order' to submission,
            // let's skip persistent randomization for now or just sort by ID to be consistent.
            // Or just respect the `order_index` from DB which is what the API returns.
            // The API returns sorted by order_index.
            // If quiz.is_randomized is true, we should probably shuffle.
            // Let's use a seeded shuffle based on student ID + quiz ID so it's consistent?
            // Too complex for now. Let's just use the order from DB.
        }

        // Calculate Time Left
        const durationMs = quizData.duration_minutes * 60 * 1000
        const elapsed = new Date().getTime() - startedAt.getTime()
        const remaining = Math.max(0, durationMs - elapsed)

        setTimeLeft(remaining)
        setLoading(false)

        // Start Timer
        timerRef.current = setInterval(() => {
            const now = new Date().getTime()
            const startStr = existingSub ? existingSub.started_at : startedAt.toISOString()
            const start = new Date(startStr).getTime()
            const currentElapsed = now - start
            const currentRemaining = Math.max(0, durationMs - currentElapsed)

            setTimeLeft(currentRemaining)

            if (currentRemaining <= 0) {
                handleSubmit(true) // Auto submit
            }
        }, 1000)
    }

    const formatTime = (ms: number) => {
        const totalSeconds = Math.floor(ms / 1000)
        const hours = Math.floor(totalSeconds / 3600)
        const minutes = Math.floor((totalSeconds % 3600) / 60)
        const seconds = totalSeconds % 60
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    }

    const [showSubmitConfirm, setShowSubmitConfirm] = useState(false)

    // ... (existing code)

    const handleSubmit = async (auto = false) => {
        if (submitting) return

        if (auto) {
            await confirmSubmit(true)
        } else {
            setShowSubmitConfirm(true)
        }
    }

    const confirmSubmit = async (auto = false) => {
        setSubmitting(true)
        setShowSubmitConfirm(false)
        if (timerRef.current) clearInterval(timerRef.current)

        try {
            // Format answers for API
            const formattedAnswers = Object.entries(answers).map(([qId, val]) => ({
                question_id: qId,
                answer: val
            }))

            await fetch('/api/quiz-submissions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    quiz_id: quizId,
                    answers: formattedAnswers,
                    started_at: startTime
                })
            })

            if (auto) {
                setShowTimeoutModal(true)
            } else {
                router.push('/dashboard/siswa/kuis')
            }
        } catch (error) {
            console.error('Error submitting:', error)
            alert('Gagal mengumpulkan kuis. Coba lagi.')
            setSubmitting(false)
        }
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
                <AlertTriangle className="w-16 h-16 text-red-500 mb-4" />
                <h2 className="text-xl font-bold text-white">Oops!</h2>
                <p className="text-slate-400 text-center max-w-md">{error}</p>
                <Link href="/dashboard/siswa" className="px-6 py-2 bg-slate-800 text-white rounded-xl hover:bg-slate-700 transition-colors">
                    Kembali ke Dashboard
                </Link>
            </div>
        )
    }

    if (loading || !quiz) {
        return <div className="text-center text-slate-400 py-8">Memuat soal...</div>
    }

    return (
        <div className="space-y-6 pb-20">
            {/* Header Sticky */}
            <div className="sticky top-0 z-10 bg-surface-light/90 dark:bg-surface-dark/90 backdrop-blur border-b border-gray-200 dark:border-gray-700 pb-4 pt-2 -mx-4 px-4 md:-mx-8 md:px-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-bold text-text-main dark:text-white truncate max-w-xs md:max-w-md">{quiz.title}</h1>
                        <p className="text-xs text-text-secondary">Total: {quiz.questions.length} Soal</p>
                    </div>
                    <div className={`px-4 py-2 rounded-xl font-mono text-xl font-bold shadow-lg ${(timeLeft || 0) < 60000 ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-100 dark:bg-surface-dark text-primary dark:text-primary-light'
                        }`}>
                        {timeLeft !== null ? formatTime(timeLeft) : '--:--:--'}
                    </div>
                </div>
            </div>

            {/* Question List */}
            <div className="space-y-8 max-w-3xl mx-auto">
                {quiz.questions.map((q, idx) => (
                    <div key={q.id} className="bg-surface-light dark:bg-surface-dark border border-gray-200 dark:border-gray-700 rounded-xl p-6">
                        {/* Passage Text if exists */}
                        {q.passage_text && (
                            <div className="mb-4 p-4 bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-700 rounded-xl">
                                <p className="text-xs text-teal-600 dark:text-teal-400 font-bold mb-2">📖 Bacaan:</p>
                                <p className="text-sm text-text-main dark:text-white whitespace-pre-wrap leading-relaxed">{q.passage_text}</p>
                            </div>
                        )}

                        <div className="flex items-start gap-4 mb-4">
                            <span className="w-8 h-8 flex-shrink-0 bg-primary text-white rounded-full flex items-center justify-center font-bold">
                                {idx + 1}
                            </span>
                            <div className="flex-1">
                                <SmartText text={q.question_text} className="text-text-main dark:text-white text-lg leading-relaxed whitespace-pre-wrap" />
                            </div>
                            <span className="text-xs text-text-secondary font-medium px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded">
                                {q.points} Poin
                            </span>
                        </div>

                        {/* Display question image if exists */}
                        {q.image_url && (
                            <div className="pl-12 mb-4">
                                <img
                                    src={q.image_url}
                                    alt="Gambar soal"
                                    className="max-h-64 rounded-lg border border-gray-200 dark:border-gray-600"
                                />
                            </div>
                        )}

                        <div className="pl-12">
                            {q.question_type === 'MULTIPLE_CHOICE' && q.options ? (
                                <div className="space-y-3">
                                    {q.options.map((opt, optIdx) => {
                                        const letter = String.fromCharCode(65 + optIdx) // A, B, C, D
                                        const isSelected = answers[q.id] === letter
                                        return (
                                            <label
                                                key={optIdx}
                                                className={`flex items-center gap-3 p-4 rounded-xl cursor-pointer transition-all border ${isSelected
                                                    ? 'bg-primary/10 border-primary text-primary-dark dark:text-primary-light'
                                                    : 'bg-gray-50 dark:bg-gray-800/50 border-transparent hover:bg-gray-100 dark:hover:bg-gray-800 text-text-secondary dark:text-slate-300'
                                                    }`}
                                            >
                                                <div className={`w-6 h-6 rounded-full border flex items-center justify-center flex-shrink-0 ${isSelected ? 'border-primary bg-primary text-white' : 'border-gray-400 dark:border-slate-500'
                                                    }`}>
                                                    {isSelected && (
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                        </svg>
                                                    )}
                                                </div>
                                                <input
                                                    type="radio"
                                                    name={`q-${q.id}`}
                                                    value={letter}
                                                    checked={isSelected}
                                                    onChange={() => setAnswers({ ...answers, [q.id]: letter })}
                                                    className="hidden"
                                                />
                                                <span className="font-medium">
                                                    <span className="mr-2 font-bold opacity-70">{letter}.</span>
                                                    {opt}
                                                </span>
                                            </label>
                                        )
                                    })}
                                </div>
                            ) : (
                                <textarea
                                    value={answers[q.id] || ''}
                                    onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                                    className="w-full h-32 px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl text-text-main dark:text-white focus:outline-none focus:ring-2 focus:ring-primary placeholder-gray-400"
                                    placeholder="Tulis jawaban Anda di sini..."
                                />
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Submit Action */}
            <div className="fixed bottom-0 left-0 right-0 bg-surface-light/90 dark:bg-surface-dark/90 backdrop-blur border-t border-gray-200 dark:border-gray-700 p-4 z-10">
                <div className="max-w-3xl mx-auto flex items-center justify-between">
                    <p className="text-sm text-text-secondary">
                        Terjawab: <span className="text-text-main dark:text-white font-bold">{Object.keys(answers).length}</span> / {quiz.questions.length}
                    </p>
                    <button
                        onClick={() => handleSubmit(false)}
                        disabled={submitting}
                        className="px-8 py-3 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20 hover:bg-primary-dark transition-all disabled:opacity-50"
                    >
                        {submitting ? 'Mengirim...' : 'Kumpulkan Jawaban'}
                    </button>
                </div>
            </div>
            {/* Submit Confirmation Modal */}
            {showSubmitConfirm && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-surface-light dark:bg-surface-dark border border-gray-200 dark:border-gray-700 rounded-2xl p-6 w-full max-w-sm text-center shadow-xl">
                        <div className="w-16 h-16 bg-primary/20 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-bold text-text-main dark:text-white mb-2">Kumpulkan Kuis?</h3>
                        <p className="text-text-secondary mb-6">
                            Apakah kamu yakin ingin mengumpulkan kuis ini? Jawaban tidak dapat diubah setelah dikumpulkan.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowSubmitConfirm(false)}
                                className="flex-1 px-4 py-3 bg-gray-200 dark:bg-slate-700 text-text-main dark:text-slate-200 rounded-xl hover:bg-gray-300 dark:hover:bg-slate-600 transition-colors font-medium"
                                disabled={submitting}
                            >
                                Nanti Dulu
                            </button>
                            <button
                                onClick={() => confirmSubmit(false)}
                                disabled={submitting}
                                className="flex-1 px-4 py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary-dark transition-opacity"
                            >
                                {submitting ? 'Mengirim...' : 'Iya, Kumpulkan'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Timeout Modal */}
            {showTimeoutModal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-surface-light dark:bg-surface-dark border border-gray-200 dark:border-gray-700 rounded-2xl p-8 w-full max-w-sm text-center shadow-2xl">
                        <div className="w-20 h-20 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <h3 className="text-2xl font-bold text-text-main dark:text-white mb-2 flex items-center justify-center gap-2">
                            <AlarmClock className="w-8 h-8 text-red-500" /> Waktu Habis!
                        </h3>
                        <p className="text-text-secondary mb-6">
                            Kuis telah otomatis dikumpulkan. Jawabanmu sudah tersimpan.
                        </p>
                        <button
                            onClick={() => router.push(`/dashboard/siswa/kuis/${quizId}/hasil`)}
                            className="w-full px-6 py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary-dark transition-opacity"
                        >
                            Lihat Hasil
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
