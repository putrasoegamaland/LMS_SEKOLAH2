'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { TimeCircle as Clock, Danger, Calendar } from 'react-iconly'

interface WarningItem {
    student_id: string
    student_name: string
    class_name: string
    subject_name: string
    avg_score: number
    score_count: number
}

interface WarningsData {
    kkm: number
    teachingWarnings: WarningItem[]
    homeroomWarnings: WarningItem[]
}

interface ScheduleEntry {
    id: string
    day_of_week: number
    period: number
    time_start: string
    time_end: string
    subject: { id: string; name: string } | null
    room: string | null
    schedule: {
        id: string
        class: { id: string; name: string; grade_level: number }
    }
}

export default function GuruDashboard() {
    const { user } = useAuth()
    const router = useRouter()
    const [warnings, setWarnings] = useState<WarningsData | null>(null)
    const [todaySchedule, setTodaySchedule] = useState<ScheduleEntry[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (user && user.role !== 'GURU') {
            router.replace('/dashboard')
        }
    }, [user, router])

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const [warnRes, scheduleRes] = await Promise.all([
                    fetch('/api/dashboard/guru/warnings'),
                    fetch('/api/schedules/my-schedule?today=true')
                ])
                const warnData = await warnRes.json()
                const scheduleData = await scheduleRes.json()

                if (!warnData.error) setWarnings(warnData)
                setTodaySchedule(Array.isArray(scheduleData) ? scheduleData : [])
            } catch (error) {
                console.error('Error:', error)
            } finally {
                setLoading(false)
            }
        }
        if (user) fetchDashboardData()
    }, [user])

    const now = new Date()
    const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

    const isCurrentPeriod = (startTime: string, endTime: string) => {
        return currentTimeStr >= startTime.slice(0, 5) && currentTimeStr < endTime.slice(0, 5)
    }

    const isPastPeriod = (endTime: string) => {
        return currentTimeStr >= endTime.slice(0, 5)
    }

    // Combine warnings
    const allWarnings = [...(warnings?.teachingWarnings || []), ...(warnings?.homeroomWarnings || [])]
    const uniqueWarnings = Array.from(new Map(allWarnings.map(item => [item.student_id + item.subject_name, item])).values())

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl lg:text-4xl font-black text-text-main dark:text-white tracking-tight">
                        Selamat Datang, <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-emerald-400">{user?.full_name?.split(' ')[0] || 'Guru'}</span>
                    </h1>
                    <p className="text-text-secondary dark:text-zinc-400 mt-2 font-medium">
                        Berikut adalah ringkasan jadwal dan peringatan akademik hari ini.
                    </p>
                </div>
                <div className="bg-white dark:bg-surface-dark px-4 py-2 rounded-2xl shadow-sm border border-black/5 dark:border-white/5 flex items-center gap-3 w-max">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                        <Calendar set="bold" size={20} />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-text-secondary uppercase tracking-wider">{now.toLocaleDateString('id-ID', { weekday: 'long' })}</p>
                        <p className="font-bold text-text-main dark:text-white">{now.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                {/* Left Column: Schedule (Timeline Style) */}
                <div className="xl:col-span-7 space-y-6">
                    <div className="flex items-center gap-3 border-b-2 border-primary/20 pb-4">
                        <div className="p-2 bg-gradient-to-br from-blue-500 to-primary rounded-xl text-white shadow-lg shadow-primary/20">
                            <Clock set="bold" size={24} />
                        </div>
                        <h2 className="text-2xl font-bold text-text-main dark:text-white tracking-tight">Jadwal Mengajar Hari Ini</h2>
                    </div>

                    {!loading && todaySchedule.length === 0 ? (
                        <div className="h-64 flex flex-col items-center justify-center text-center p-8 bg-gradient-to-br from-blue-50/50 to-transparent dark:from-blue-900/10 dark:to-transparent rounded-3xl border border-blue-100 dark:border-blue-900/30">
                            <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/30 text-blue-500 rounded-full flex items-center justify-center mb-4">
                                <Clock set="bold" size={40} />
                            </div>
                            <h3 className="text-xl font-bold text-text-main dark:text-white mb-2">Tidak Ada Jadwal Mengajar</h3>
                            <p className="text-text-secondary dark:text-zinc-400">Anda tidak memiliki jadwal kelas untuk hari ini. Waktu luang dapat digunakan untuk mengoreksi tugas atau menyiapkan materi.</p>
                        </div>
                    ) : (
                        <div className="relative pl-6 lg:pl-8 space-y-8">
                            {/* Timeline Line */}
                            <div className="absolute left-0 top-2 bottom-6 w-0.5 bg-gradient-to-b from-primary/50 via-primary/20 to-transparent rounded-full ml-[11px] lg:ml-[15px]"></div>

                            {todaySchedule.map((entry, index) => {
                                const current = isCurrentPeriod(entry.time_start, entry.time_end)
                                const past = isPastPeriod(entry.time_end)

                                return (
                                    <div key={entry.id} className={`relative flex flex-col sm:flex-row gap-4 sm:gap-6 group transition-all duration-300 ${past ? 'opacity-60 grayscale-[0.3]' : ''}`}>
                                        {/* Timeline Dot */}
                                        <div className={`absolute -left-6 lg:-left-8 mt-1.5 w-6 h-6 rounded-full border-4 flex items-center justify-center z-10 transition-colors ${current
                                            ? 'bg-primary border-primary/30 outline outline-4 outline-primary/10 animate-pulse'
                                            : past
                                                ? 'bg-zinc-300 dark:bg-zinc-600 border-white dark:border-surface-dark'
                                                : 'bg-white dark:bg-surface-dark border-primary'
                                            }`}>
                                            {current && <div className="w-2 h-2 bg-white rounded-full"></div>}
                                        </div>

                                        {/* Time Block */}
                                        <div className="sm:w-32 flex-shrink-0 pt-1">
                                            <div className={`text-xl font-black ${current ? 'text-primary' : 'text-text-main dark:text-white'}`}>
                                                {entry.time_start.slice(0, 5)}
                                            </div>
                                            <div className="text-sm font-bold text-text-secondary dark:text-zinc-500">
                                                - {entry.time_end.slice(0, 5)}
                                            </div>
                                            <div className="text-xs font-medium text-text-secondary mt-1 bg-black/5 dark:bg-white/5 inline-block px-2 py-0.5 rounded-full">
                                                Jam ke-{entry.period}
                                            </div>
                                        </div>

                                        {/* Class Card */}
                                        <div className={`flex-1 rounded-2xl p-5 md:p-6 transition-all duration-300 border backdrop-blur-xl ${current
                                            ? 'bg-gradient-to-br from-primary/10 to-transparent border-primary/30 shadow-lg shadow-primary/10 scale-[1.02] lg:transform-origin-left'
                                            : 'bg-white/70 dark:bg-surface-dark/70 border-black/5 dark:border-white/5 shadow-sm hover:shadow-md'
                                            }`}>
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                                <div>
                                                    <h3 className={`text-xl font-black mb-1 ${current ? 'text-primary' : 'text-text-main dark:text-white'}`}>
                                                        {entry.subject?.name || 'Mata Pelajaran'}
                                                    </h3>
                                                    <div className="flex items-center gap-3">
                                                        <span className="inline-flex items-center gap-1.5 text-sm font-bold text-text-secondary">
                                                            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                                            Kelas {entry.schedule.class.name}
                                                        </span>
                                                        {entry.room && (
                                                            <span className="inline-flex items-center gap-1.5 text-sm font-bold text-text-secondary border-l border-zinc-300 dark:border-zinc-700 pl-3">
                                                                Ruangan: {entry.room}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                {current && (
                                                    <span className="px-3 py-1 bg-primary text-white text-xs font-bold rounded-full animate-pulse self-start sm:self-center">
                                                        Sedang Berlangsung
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>

                {/* Right Column: Academic Warnings */}
                <div className="xl:col-span-5 space-y-6">
                    <div className="flex items-center justify-between border-b-2 border-red-500/20 pb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-gradient-to-br from-red-500 to-orange-500 rounded-xl text-white shadow-lg shadow-red-500/20">
                                <Danger set="bold" size={24} />
                            </div>
                            <h2 className="text-2xl font-bold text-text-main dark:text-white tracking-tight">Peringatan</h2>
                        </div>
                        {warnings?.kkm && (
                            <div className="bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 text-xs font-bold px-3 py-1.5 rounded-full border border-red-200 dark:border-red-800">
                                KKM: {warnings.kkm}
                            </div>
                        )}
                    </div>

                    {!loading && uniqueWarnings.length === 0 ? (
                        <div className="h-64 flex flex-col items-center justify-center text-center p-8 bg-gradient-to-br from-emerald-50/50 to-transparent dark:from-emerald-900/10 dark:to-transparent rounded-3xl border border-emerald-100 dark:border-emerald-900/30">
                            <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-500 rounded-full flex items-center justify-center mb-4">
                                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                            </div>
                            <h3 className="text-xl font-bold text-text-main dark:text-white mb-2">Semua Aman!</h3>
                            <p className="text-text-secondary dark:text-zinc-400">Tidak ada siswa dengan nilai rata-rata di bawah KKM sejauh ini.</p>
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            {uniqueWarnings.map((warning, idx) => (
                                <div key={idx} className="group flex items-center gap-4 p-4 rounded-2xl bg-white/70 dark:bg-surface-dark/70 backdrop-blur-xl border border-red-100 dark:border-red-900/30 shadow-sm hover:shadow-md hover:border-red-300 dark:hover:border-red-700 transition-all">
                                    {/* Score Indicator */}
                                    <div className="relative w-14 h-14 flex items-center justify-center flex-shrink-0">
                                        <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 36 36">
                                            <path className="text-red-100 dark:text-red-900/50" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
                                            <path className="text-red-500" strokeDasharray={`${Math.min(100, Math.max(0, warning.avg_score))}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                                        </svg>
                                        <span className="font-black text-red-600 dark:text-red-400 text-sm">{Math.round(warning.avg_score)}</span>
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-bold text-text-main dark:text-white truncate">
                                            {warning.student_name}
                                        </h4>
                                        <div className="flex items-center gap-2 mt-1 -mx-1">
                                            <span className="px-2 py-0.5 bg-black/5 dark:bg-white/5 rounded text-[10px] font-bold text-text-secondary">
                                                {warning.class_name}
                                            </span>
                                            <span className="px-2 py-0.5 bg-black/5 dark:bg-white/5 rounded text-[10px] font-bold text-text-secondary truncate">
                                                {warning.subject_name}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Action button */}
                                    <Link href={`/dashboard/guru/wali-kelas/${warning.student_id}`} className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-red-50 dark:bg-red-900/20 text-red-500 hover:bg-red-500 hover:text-white transition-colors">
                                        <svg className="w-5 h-5 ml-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                    </Link>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

