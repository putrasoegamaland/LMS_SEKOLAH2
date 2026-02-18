'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import Card from '@/components/ui/Card'
import { Document, Edit, TimeCircle, Game, Chart, Home, User, Voice, Danger, Calendar, ArrowRight } from 'react-iconly'
import { PartyPopper, GraduationCap } from 'lucide-react'

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

interface DeadlineItem {
    id: string
    type: 'TUGAS' | 'ULANGAN'
    title: string
    subject: string
    deadline: string
    link: string
    timeLeft: number // in hours
}

export default function SiswaDashboard() {
    const { user } = useAuth()
    const router = useRouter()
    const [student, setStudent] = useState<StudentData | null>(null)
    const [announcements, setAnnouncements] = useState<Announcement[]>([])
    const [loading, setLoading] = useState(true)

    // Deadline Warning State
    const [upcomingDeadlines, setUpcomingDeadlines] = useState<DeadlineItem[]>([])

    // Resume Modal State
    const [resumeItem, setResumeItem] = useState<{
        type: 'Kuis' | 'Ulangan'
        title: string
        link: string
        remainingTime?: string
    } | null>(null)
    const [showResumeModal, setShowResumeModal] = useState(false)

    // Promotion Popup State
    const [promotionInfo, setPromotionInfo] = useState<{ fromClass: string; toClass: string } | null>(null)
    const [showPromotionPopup, setShowPromotionPopup] = useState(false)

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

                // Check for promotion status
                if (myStudent) {
                    try {
                        const enrollRes = await fetch(`/api/student-enrollments?student_id=${myStudent.id}`)
                        if (enrollRes.ok) {
                            const enrollments = await enrollRes.json()
                            const promotedEnrollment = enrollments.find((e: { status: string }) => e.status === 'PROMOTED')
                            if (promotedEnrollment) {
                                const storageKey = `promotion_seen_${myStudent.id}_${promotedEnrollment.id}`
                                if (!localStorage.getItem(storageKey)) {
                                    setPromotionInfo({
                                        fromClass: promotedEnrollment.class?.name || 'Kelas Sebelumnya',
                                        toClass: myStudent.class?.name || 'Kelas Baru'
                                    })
                                    setShowPromotionPopup(true)
                                    localStorage.setItem(storageKey, 'true')
                                }
                            }
                        }
                    } catch (err) {
                        console.error('Error checking promotion:', err)
                    }
                }

                // Fetch announcements for student's class
                if (myStudent?.class?.id) {
                    const announcementsRes = await fetch(`/api/announcements?class_id=${myStudent.class.id}&limit=5`)
                    if (announcementsRes.ok) {
                        const data = await announcementsRes.json()
                        setAnnouncements(Array.isArray(data) ? data : [])
                    }

                    // --- Fetch Deadlines (Tugas & Ulangan) ---
                    const [assignmentsRes, examsRes, submissionsRes, examSubmissionsRes] = await Promise.all([
                        fetch('/api/assignments'),
                        fetch('/api/exams'),
                        fetch(`/api/submissions?student_id=${myStudent.id}`), // Tugas submissions
                        fetch(`/api/exam-submissions?student_id=${myStudent.id}`) // Ulangan submissions
                    ])

                    const assignmentsData = await assignmentsRes.json()
                    const examsData = await examsRes.json()
                    const submissionsData = await submissionsRes.json()
                    const examSubmissionsData = await examSubmissionsRes.json()

                    const assignments = Array.isArray(assignmentsData) ? assignmentsData : []
                    const exams = Array.isArray(examsData) ? examsData : []
                    const assignmentSubmissions = Array.isArray(submissionsData) ? submissionsData : []
                    const examSubmissions = Array.isArray(examSubmissionsData) ? examSubmissionsData : []

                    const now = new Date().getTime()
                    const warningThreshold = 48 * 60 * 60 * 1000 // 48 hours in ms
                    const newDeadlines: DeadlineItem[] = []

                    // Process Assignments
                    assignments.forEach((a: any) => {
                        // Filter by class
                        if (a.teaching_assignment?.class?.name !== myStudent.class.name) return
                        // Filter if already submitted
                        if (assignmentSubmissions.some((s: any) => s.assignment_id === a.id)) return
                        // Filter if no due date
                        if (!a.due_date) return

                        const dueDate = new Date(a.due_date).getTime()
                        const diff = dueDate - now

                        if (diff > 0 && diff <= warningThreshold) {
                            newDeadlines.push({
                                id: a.id,
                                type: 'TUGAS',
                                title: a.title,
                                subject: a.teaching_assignment?.subject?.name || 'Mapel',
                                deadline: a.due_date,
                                link: '/dashboard/siswa/tugas',
                                timeLeft: diff / (1000 * 60 * 60)
                            })
                        }
                    })

                    // Process Exams
                    exams.forEach((e: any) => {
                        // Filter by class (assuming API returns teaching_assignment with class)
                        if (e.teaching_assignment?.class?.name !== myStudent.class.name) return
                        // Filter if already submitted
                        if (examSubmissions.some((s: any) => s.exam_id === e.id && s.is_submitted)) return
                        // Active exams only
                        if (!e.is_active) return

                        const startTime = new Date(e.start_time).getTime()
                        // Use start_time + duration as rough "due date" window, or just start_time if it's strictly scheduled
                        // Let's use strict end time logic: start_time + duration
                        const endTime = startTime + (e.duration_minutes * 60 * 1000)
                        const diff = endTime - now

                        // Logic: If it's available NOW or starting soon, and ends within 48h
                        // For exams, "deadline" is the end time.
                        if (diff > 0 && diff <= warningThreshold) {
                            newDeadlines.push({
                                id: e.id,
                                type: 'ULANGAN',
                                title: e.title,
                                subject: e.teaching_assignment?.subject?.name || 'Mapel',
                                deadline: new Date(endTime).toISOString(),
                                link: `/dashboard/siswa/ulangan/${e.id}`, // Direct link to start
                                timeLeft: diff / (1000 * 60 * 60)
                            })
                        }
                    })

                    // Sort by most urgent
                    newDeadlines.sort((a, b) => a.timeLeft - b.timeLeft)
                    setUpcomingDeadlines(newDeadlines)
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
                // Fetch student ID first (Already done in fetchData but safe to repeat or optimize later)
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
        { href: '/dashboard/siswa/materi', icon: Document, label: 'Materi', sub: 'Bahan belajar', variant: 'blue' as const },
        { href: '/dashboard/siswa/tugas', icon: Edit, label: 'Tugas', sub: 'Kerjakan PR', variant: 'amber' as const },
        { href: '/dashboard/siswa/ulangan', icon: TimeCircle, label: 'Ulangan', sub: 'Ujian sekolah', variant: 'red' as const },
        { href: '/dashboard/siswa/kuis', icon: Game, label: 'Kuis', sub: 'Latihan soal', variant: 'purple' as const },
        { href: '/dashboard/siswa/nilai', icon: Chart, label: 'Nilai', sub: 'Lihat rapor', variant: 'green' as const },
    ]

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('id-ID', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        })
    }

    const formatHour = (dateString: string) => {
        return new Date(dateString).toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit'
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
                            <Home set="bold" primaryColor="currentColor" size={20} />
                            <span>Kelas: {student.class.name}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Deadline Warning Section */}
            {!loading && upcomingDeadlines.length > 0 && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg animate-pulse text-red-500">
                                <Danger set="bold" primaryColor="currentColor" size={24} />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-text-main dark:text-white">Penting: Segera Kerjakan!</h2>
                                <p className="text-sm text-red-500 dark:text-red-400 font-medium">
                                    {upcomingDeadlines.length} tugas/ulangan mendekati deadline (&lt; 48 jam)
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                        {upcomingDeadlines.map((item) => (
                            <Link key={item.id} href={item.link}>
                                <div className="group h-full bg-white dark:bg-surface-dark border-l-4 border-red-500 rounded-r-xl rounded-l-md p-4 shadow-sm hover:shadow-md transition-all relative overflow-hidden">
                                    {/* Background gradient/glow on hover */}
                                    <div className="absolute inset-0 bg-gradient-to-r from-red-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>

                                    <div className="relative">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase tracking-wider ${item.type === 'ULANGAN'
                                                ? 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300'
                                                : 'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-300'
                                                }`}>
                                                {item.type}
                                            </span>
                                            <span className="text-xs font-bold text-red-500 flex items-center gap-1">
                                                <TimeCircle set="bold" primaryColor="currentColor" size={12} />
                                                {Math.ceil(item.timeLeft)} jam lagi
                                            </span>
                                        </div>

                                        <h3 className="font-bold text-text-main dark:text-white mb-1 line-clamp-1 group-hover:text-primary transition-colors">
                                            {item.title}
                                        </h3>

                                        <div className="flex items-center justify-between mt-3 text-xs text-text-secondary dark:text-zinc-400">
                                            <span className="flex items-center gap-1">
                                                <Document set="bold" primaryColor="currentColor" size={12} />
                                                {item.subject}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Calendar set="bold" primaryColor="currentColor" size={12} />
                                                {formatDate(item.deadline)}, {formatHour(item.deadline)}
                                            </span>
                                        </div>

                                        <div className="mt-3 flex items-center justify-end text-primary text-xs font-bold opacity-0 group-hover:opacity-100 transform translate-x-2 group-hover:translate-x-0 transition-all gap-1">
                                            Kerjakan Sekarang <ArrowRight set="bold" primaryColor="currentColor" size={14} />
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            )}

            {/* Quick Actions */}
            <div>
                <h2 className="text-xl font-bold text-text-main dark:text-white mb-6">Menu Belajar</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
                    {quickLinks.map((link) => (
                        <Link key={link.href} href={link.href}>
                            <Card className="h-full border-2 border-primary/30 hover:border-primary hover:shadow-lg hover:shadow-primary/10 active:scale-95 transition-all group bg-white dark:bg-surface-dark cursor-pointer p-3 sm:p-4">
                                <div className="flex flex-col items-center text-center gap-2 sm:gap-3">
                                    {/* Duotone Icon Container */}
                                    <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl flex items-center justify-center transition-all duration-300 ${link.href.includes('materi') ? 'bg-blue-100 dark:bg-blue-900/30 group-hover:bg-blue-600 text-blue-600 dark:text-blue-400 group-hover:text-white' :
                                        link.href.includes('tugas') ? 'bg-amber-100 dark:bg-amber-900/30 group-hover:bg-amber-600 text-amber-600 dark:text-amber-400 group-hover:text-white' :
                                            link.href.includes('ulangan') ? 'bg-red-100 dark:bg-red-900/30 group-hover:bg-red-600 text-red-600 dark:text-red-400 group-hover:text-white' :
                                                link.href.includes('kuis') ? 'bg-purple-100 dark:bg-purple-900/30 group-hover:bg-purple-600 text-purple-600 dark:text-purple-400 group-hover:text-white' :
                                                    'bg-green-100 dark:bg-green-900/30 group-hover:bg-green-600 text-green-600 dark:text-green-400 group-hover:text-white'
                                        }`}>
                                        <link.icon set="bold" primaryColor="currentColor" size={24} />
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
                                <User set="bold" primaryColor="currentColor" size={24} />
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
                            <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-sm text-orange-500">
                                <Voice set="bold" primaryColor="currentColor" size={24} />
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
                                <TimeCircle set="bold" primaryColor="currentColor" size={40} />
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

            {/* Promotion Celebration Popup */}
            {showPromotionPopup && promotionInfo && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-surface-dark rounded-3xl shadow-2xl max-w-sm w-full p-8 text-center relative overflow-hidden">
                        {/* Confetti decoration */}
                        <div className="absolute inset-0 pointer-events-none">
                            {[...Array(20)].map((_, i) => (
                                <div
                                    key={i}
                                    className="absolute w-2 h-2 rounded-full animate-bounce"
                                    style={{
                                        left: `${Math.random() * 100}%`,
                                        top: `${Math.random() * 100}%`,
                                        backgroundColor: ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7'][i % 6],
                                        animationDelay: `${Math.random() * 2}s`,
                                        animationDuration: `${1 + Math.random()}s`
                                    }}
                                />
                            ))}
                        </div>

                        <div className="relative">
                            <div className="flex justify-center gap-3 mb-4">
                                <PartyPopper className="w-10 h-10 text-yellow-500 animate-bounce" />
                                <GraduationCap className="w-12 h-12 text-primary" />
                                <PartyPopper className="w-10 h-10 text-yellow-500 animate-bounce" style={{ animationDelay: '0.5s' }} />
                            </div>

                            <h2 className="text-2xl font-bold text-text-main dark:text-white mb-2">
                                🎉 Selamat Naik Kelas!
                            </h2>
                            <p className="text-text-secondary dark:text-zinc-400 mb-4">
                                Kamu berhasil naik dari <strong>{promotionInfo.fromClass}</strong> ke <strong>{promotionInfo.toClass}</strong>!
                            </p>
                            <p className="text-sm text-text-secondary dark:text-zinc-500 mb-6">
                                Terus semangat belajar ya! 💪
                            </p>

                            <button
                                onClick={() => setShowPromotionPopup(false)}
                                className="w-full py-3.5 bg-gradient-to-r from-primary to-emerald-500 text-white rounded-xl font-bold shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all"
                            >
                                Terima Kasih! 🚀
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
