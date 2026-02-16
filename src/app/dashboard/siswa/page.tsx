'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import Card from '@/components/ui/Card'
import { BookOpen, PenTool, Clock, Brain, BarChart3, School, User, Megaphone } from 'lucide-react'

interface StudentData {
    id: string
    nis: string | null
    class: { id: string; name: string } | null
}

interface Announcement {
    id: string
    title: string
    content: string
    published_at: string
}

export default function SiswaDashboard() {
    const { user } = useAuth()
    const router = useRouter()
    const [student, setStudent] = useState<StudentData | null>(null)
    const [announcements, setAnnouncements] = useState<Announcement[]>([])
    const [loading, setLoading] = useState(true)

    // Resume Modal State
    const [resumeItem, setResumeItem] = useState<{
        type: 'Kuis' | 'Ulangan'
        title: string
        link: string
        remainingTime?: string
    } | null>(null)
    const [showResumeModal, setShowResumeModal] = useState(false)

    useEffect(() => {
        if (user && user.role !== 'SISWA') {
            router.replace('/dashboard')
        }
    }, [user, router])

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch student data first to get class_id
                const studentsRes = await fetch('/api/students')
                const students = await studentsRes.json()
                const myStudent = students.find((s: { user: { id: string } }) => s.user.id === user?.id)
                setStudent(myStudent || null)

                // Fetch announcements for student's class
                if (myStudent?.class?.id) {
                    const announcementsRes = await fetch(`/api/announcements?class_id=${myStudent.class.id}&limit=5`)
                    if (announcementsRes.ok) {
                        const data = await announcementsRes.json()
                        setAnnouncements(Array.isArray(data) ? data : [])
                    }
                }
            } catch (error) {
                console.error('Error:', error)
            } finally {
                setLoading(false)
            }
        }
        if (user) fetchData()
    }, [user])

    // Check for incomplete assessments and auto-submit expired ones
    useEffect(() => {
        if (!user || user.role !== 'SISWA') return

        const checkIncomplete = async () => {
            try {
                // Fetch student ID first
                const studentsRes = await fetch('/api/students')
                const students = await studentsRes.json()
                const myStudent = students.find((s: any) => s.user.id === user.id)

                if (!myStudent) return

                const [quizRes, examRes] = await Promise.all([
                    fetch(`/api/quiz-submissions?student_id=${myStudent.id}`),
                    fetch(`/api/exam-submissions?student_id=${myStudent.id}`)
                ])

                const quizzes = await quizRes.json()
                const exams = await examRes.json()

                let foundResumeItem = null

                // Check active exams first (higher priority)
                if (Array.isArray(exams)) {
                    for (const e of exams) {
                        if (!e.is_submitted && e.exam?.is_active) {
                            const startedAt = new Date(e.started_at).getTime()
                            const durationMs = (e.exam.duration_minutes || 0) * 60 * 1000
                            const now = Date.now()
                            // Buffer 1 min
                            const isExpired = now > (startedAt + durationMs + 60000)

                            if (isExpired) {
                                // Auto-submit background
                                console.log('Auto-submitting expired exam:', e.id)
                                await fetch('/api/exam-submissions', {
                                    method: 'PUT',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                        submission_id: e.id,
                                        submit: true
                                    })
                                })
                            } else if (!foundResumeItem) {
                                foundResumeItem = {
                                    type: 'Ulangan' as const,
                                    title: e.exam?.title || 'Ulangan Tanpa Judul',
                                    link: `/dashboard/siswa/ulangan/${e.exam_id}`,
                                    // Calculate remaining time for display if needed
                                    remainingTime: undefined
                                }
                            }
                        }
                    }
                }

                // Check active quizzes
                if (Array.isArray(quizzes)) {
                    for (const q of quizzes) {
                        if (!q.submitted_at && q.quiz?.is_active) {
                            const startedAt = new Date(q.started_at).getTime()
                            const durationMs = (q.quiz.duration_minutes || 0) * 60 * 1000
                            const now = Date.now()
                            const isExpired = now > (startedAt + durationMs + 60000)

                            if (isExpired) {
                                // Auto-submit background
                                console.log('Auto-submitting expired quiz:', q.id)
                                await fetch('/api/quiz-submissions', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                        quiz_id: q.quiz_id,
                                        answers: [], // Safe: API uses existing answers if empty
                                        submit: true
                                    })
                                })
                            } else if (!foundResumeItem) {
                                foundResumeItem = {
                                    type: 'Kuis' as const,
                                    title: q.quiz?.title || 'Kuis Tanpa Judul',
                                    link: `/dashboard/siswa/kuis/${q.quiz_id}`
                                }
                            }
                        }
                    }
                }

                if (foundResumeItem) {
                    setResumeItem(foundResumeItem)
                    setShowResumeModal(true)
                }

            } catch (error) {
                console.error('Error checking incomplete assessments:', error)
            }
        }

        checkIncomplete()
    }, [user])

    const quickLinks = [
        { href: '/dashboard/siswa/materi', icon: BookOpen, label: 'Materi', sub: 'Bahan belajar', variant: 'blue' as const },
        { href: '/dashboard/siswa/tugas', icon: PenTool, label: 'Tugas', sub: 'Kerjakan PR', variant: 'amber' as const },
        { href: '/dashboard/siswa/ulangan', icon: Clock, label: 'Ulangan', sub: 'Ujian sekolah', variant: 'red' as const },
        { href: '/dashboard/siswa/kuis', icon: Brain, label: 'Kuis', sub: 'Latihan soal', variant: 'purple' as const },
        { href: '/dashboard/siswa/nilai', icon: BarChart3, label: 'Nilai', sub: 'Lihat rapor', variant: 'green' as const },
    ]

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('id-ID', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        })
    }

    return (
        <div className="space-y-8">
            {/* Welcome */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-primary to-primary-dark p-8 shadow-xl shadow-primary/20">
                <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10"></div>
                <div className="absolute -right-20 -top-20 w-80 h-80 bg-white/10 rounded-full blur-3xl"></div>

                <div className="relative">
                    <h1 className="text-3xl font-bold text-white mb-2 leading-tight">
                        Selamat Datang, {user?.full_name || 'Siswa'}! 👋
                    </h1>
                    <p className="text-blue-50/90 text-lg mb-4">
                        Semangat belajar hari ini! Jangan lupa cek tugas terbaru.
                    </p>

                    {!loading && student?.class && (
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-md rounded-full text-white font-medium text-sm">
                            <School className="w-5 h-5" strokeWidth={2} />
                            <span>Kelas: {student.class.name}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Quick Actions */}
            <div>
                <h2 className="text-xl font-bold text-text-main dark:text-white mb-6">Menu Belajar</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
                    {quickLinks.map((link) => (
                        <Link key={link.href} href={link.href}>
                            <Card className="h-full border-2 border-primary/30 hover:border-primary hover:shadow-lg hover:shadow-primary/10 active:scale-95 transition-all group bg-white dark:bg-surface-dark cursor-pointer p-3 sm:p-4">
                                <div className="flex flex-col items-center text-center gap-2 sm:gap-3">
                                    {/* Duotone Icon Container */}
                                    <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl flex items-center justify-center transition-all duration-300 ${link.href.includes('materi') ? 'bg-blue-100 dark:bg-blue-900/30 group-hover:bg-blue-600' :
                                        link.href.includes('tugas') ? 'bg-amber-100 dark:bg-amber-900/30 group-hover:bg-amber-600' :
                                            link.href.includes('ulangan') ? 'bg-red-100 dark:bg-red-900/30 group-hover:bg-red-600' :
                                                link.href.includes('kuis') ? 'bg-purple-100 dark:bg-purple-900/30 group-hover:bg-purple-600' :
                                                    'bg-green-100 dark:bg-green-900/30 group-hover:bg-green-600'
                                        }`}>
                                        <link.icon className={`w-6 h-6 sm:w-7 sm:h-7 transition-colors ${link.href.includes('materi') ? 'text-blue-600 dark:text-blue-400 group-hover:text-white' :
                                            link.href.includes('tugas') ? 'text-amber-600 dark:text-amber-400 group-hover:text-white' :
                                                link.href.includes('ulangan') ? 'text-red-600 dark:text-red-400 group-hover:text-white' :
                                                    link.href.includes('kuis') ? 'text-purple-600 dark:text-purple-400 group-hover:text-white' :
                                                        'text-green-600 dark:text-green-400 group-hover:text-white'
                                            }`} strokeWidth={2} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-text-main dark:text-white group-hover:text-primary transition-colors text-sm sm:text-lg">{link.label}</h3>
                                        <p className="text-[10px] sm:text-xs text-text-secondary dark:text-[#A8BC9F] mt-0.5 sm:mt-1 line-clamp-1">{link.sub}</p>
                                    </div>
                                </div>
                            </Card>
                        </Link>
                    ))}
                </div>
            </div>

            {/* Info Card */}
            {!loading && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-12 h-12 rounded-full bg-secondary/20 flex items-center justify-center text-primary">
                                <User className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-text-main dark:text-white">Informasi Akun</h3>
                                <p className="text-sm text-text-secondary dark:text-[#A8BC9F]">Detail data diri siswa</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-3 bg-secondary/5 rounded-xl">
                                <span className="text-sm text-text-secondary dark:text-[#A8BC9F]">Nama Lengkap</span>
                                <span className="font-bold text-text-main dark:text-white">{user?.full_name || '-'}</span>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-secondary/5 rounded-xl">
                                <span className="text-sm text-text-secondary dark:text-[#A8BC9F]">NIS</span>
                                <span className="font-bold text-text-main dark:text-white">{student?.nis || '-'}</span>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-secondary/5 rounded-xl">
                                <span className="text-sm text-text-secondary dark:text-[#A8BC9F]">Kelas</span>
                                <span className="font-bold text-text-main dark:text-white">{student?.class?.name || 'Belum ada kelas'}</span>
                            </div>
                        </div>
                    </Card>

                    <Card className="bg-gradient-to-br from-secondary/10 to-primary/5 border-none">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-sm">
                                <Megaphone className="w-6 h-6 text-orange-500" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-text-main dark:text-white">Pengumuman</h3>
                                <p className="text-sm text-text-secondary dark:text-[#A8BC9F]">Info terbaru dari sekolah</p>
                            </div>
                        </div>

                        {announcements.length === 0 ? (
                            <div className="text-center py-8 text-text-secondary dark:text-[#A8BC9F] italic">
                                Belum ada pengumuman baru untuk saat ini.
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {announcements.slice(0, 3).map((announcement) => (
                                    <div key={announcement.id} className="p-3 bg-white/50 dark:bg-surface-dark/50 rounded-xl">
                                        <div className="flex items-start justify-between gap-2">
                                            <h4 className="font-bold text-text-main dark:text-white text-sm line-clamp-1">{announcement.title}</h4>
                                            <span className="text-xs text-text-secondary whitespace-nowrap">{formatDate(announcement.published_at)}</span>
                                        </div>
                                        <p className="text-xs text-text-secondary dark:text-zinc-400 mt-1 line-clamp-2">{announcement.content}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Card>
                </div>
            )}

            {/* Global Resume Modal */}
            {showResumeModal && resumeItem && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                    <div className="bg-surface-light dark:bg-surface-dark border-2 border-primary/20 rounded-2xl p-8 w-full max-w-md text-center shadow-2xl relative overflow-hidden">
                        {/* Decorative background blob */}
                        <div className="absolute -top-20 -right-20 w-40 h-40 bg-primary/10 rounded-full blur-3xl"></div>
                        <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl"></div>

                        <div className="relative">
                            <div className="w-20 h-20 bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner ring-4 ring-white dark:ring-surface-dark">
                                <Clock className="w-10 h-10" />
                            </div>

                            <h3 className="text-2xl font-bold text-text-main dark:text-white mb-2">
                                Ada {resumeItem.type} Belum Selesai!
                            </h3>

                            <div className="bg-surface-ground/50 dark:bg-surface-ground/30 rounded-xl p-4 my-6 border border-secondary/10">
                                <p className="text-sm text-text-secondary dark:text-zinc-400 mb-1">
                                    Kamu sedang mengerjakan:
                                </p>
                                <p className="text-lg font-bold text-primary truncate px-2">
                                    {resumeItem.title}
                                </p>
                            </div>

                            <div className="space-y-3">
                                <Link
                                    href={resumeItem.link}
                                    className="w-full block py-3.5 bg-gradient-to-r from-primary to-blue-600 text-white rounded-xl font-bold shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:scale-[1.02] transition-all"
                                >
                                    🚀 Lanjutkan Sekarang
                                </Link>

                                <button
                                    onClick={() => setShowResumeModal(false)}
                                    className="w-full py-3 text-text-secondary hover:text-text-main dark:text-zinc-400 dark:hover:text-white transition-colors"
                                >
                                    Nanti Saja
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
