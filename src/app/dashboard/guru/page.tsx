'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import Card from '@/components/ui/Card'
import { Document as BookOpen, Edit as PenTool, TimeCircle as Clock, Discovery as Brain, Folder as Archive, Graph as BarChart3, ArrowRight, Home as School, Calendar } from 'react-iconly'
import { Loader2 } from 'lucide-react'

interface TeachingAssignment {
    id: string
    subject: { name: string }
    class: { id: string; name: string }
    academic_year: { name: string; is_active: boolean }
}

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
    teacher: { id: string; user: { full_name: string } } | null
    room: string | null
    schedule: {
        id: string
        class: { id: string; name: string; grade_level: number }
    }
}

const DAYS = ['', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu']
const DAYS_SHORT = ['', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']

export default function GuruDashboard() {
    const { user } = useAuth()
    const router = useRouter()
    const [assignments, setAssignments] = useState<TeachingAssignment[]>([])
    const [warnings, setWarnings] = useState<WarningsData | null>(null)
    const [loading, setLoading] = useState(true)

    // Schedule state
    const [todaySchedule, setTodaySchedule] = useState<ScheduleEntry[]>([])
    const [fullSchedule, setFullSchedule] = useState<ScheduleEntry[]>([])
    const [scheduleLoading, setScheduleLoading] = useState(true)
    const [showFullSchedule, setShowFullSchedule] = useState(false)

    useEffect(() => {
        if (user && user.role !== 'GURU') {
            router.replace('/dashboard')
        }
    }, [user, router])

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const [assignRes, warnRes] = await Promise.all([
                    fetch('/api/my-teaching-assignments'),
                    fetch('/api/dashboard/guru/warnings')
                ])
                const assignData = await assignRes.json()
                const warnData = await warnRes.json()
                if (Array.isArray(assignData)) {
                    setAssignments(assignData)
                } else {
                    setAssignments([])
                }
                if (!warnData.error) {
                    setWarnings(warnData)
                }
            } catch (error) {
                console.error('Error:', error)
            } finally {
                setLoading(false)
            }
        }
        if (user) fetchDashboardData()
    }, [user])

    // Fetch schedule
    useEffect(() => {
        const fetchSchedule = async () => {
            try {
                const [todayRes, fullRes] = await Promise.all([
                    fetch('/api/schedules/my-schedule?today=true'),
                    fetch('/api/schedules/my-schedule')
                ])
                const [todayData, fullData] = await Promise.all([todayRes.json(), fullRes.json()])
                setTodaySchedule(Array.isArray(todayData) ? todayData : [])
                setFullSchedule(Array.isArray(fullData) ? fullData : [])
            } catch (error) {
                console.error('Error fetching schedule:', error)
            } finally {
                setScheduleLoading(false)
            }
        }
        if (user) fetchSchedule()
    }, [user])

    const quickLinks = [
        { href: '/dashboard/guru/materi', icon: BookOpen, label: 'Materi', sub: 'Upload bahan ajar' },
        { href: '/dashboard/guru/tugas', icon: PenTool, label: 'Tugas', sub: 'Buat tugas siswa' },
        { href: '/dashboard/guru/ulangan', icon: Clock, label: 'Ulangan', sub: 'Kunci tab & timer' },
        { href: '/dashboard/guru/kuis', icon: Brain, label: 'Kuis', sub: 'Review & latihan' },
        { href: '/dashboard/guru/bank-soal', icon: Archive, label: 'Bank Soal', sub: 'Simpan & pakai lagi' },
        { href: '/dashboard/guru/nilai', icon: BarChart3, label: 'Nilai', sub: 'Rekap penilaian' },
        { href: '/dashboard/guru/wali-kelas', icon: School, label: 'Wali Kelas', sub: 'Data siswa perwalian' },
    ]

    // Get current time for highlighting
    const now = new Date()
    const currentHour = now.getHours()
    const currentMinute = now.getMinutes()
    const currentTimeStr = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`

    const isCurrentPeriod = (startTime: string, endTime: string) => {
        return currentTimeStr >= startTime.slice(0, 5) && currentTimeStr < endTime.slice(0, 5)
    }

    // Get today's day number (1=Monday)
    const jsDay = now.getDay()
    const todayDayNum = jsDay === 0 ? 7 : jsDay

    // Group full schedule by day for the expanded view
    const scheduleByDay: Record<number, ScheduleEntry[]> = {}
    fullSchedule.forEach(entry => {
        if (!scheduleByDay[entry.day_of_week]) scheduleByDay[entry.day_of_week] = []
        scheduleByDay[entry.day_of_week].push(entry)
    })
    // Sort each day by period
    Object.values(scheduleByDay).forEach(arr => arr.sort((a, b) => a.period - b.period))

    return (
        <div className="space-y-8">
            {/* Welcome */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-primary to-primary-dark p-8 shadow-xl shadow-primary/20">
                <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10"></div>
                <div className="absolute -right-20 -top-20 w-80 h-80 bg-white/10 rounded-full blur-3xl"></div>

                <div className="relative">
                    <h1 className="text-3xl font-bold text-white mb-2 leading-tight">
                        Selamat Datang, {user?.full_name || 'Bapak/Ibu Guru'}! 👋
                    </h1>
                    <p className="text-blue-50/90 text-lg">
                        Dashboard Guru - Kelola pembelajaran dengan mudah
                    </p>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
                {quickLinks.map((link) => (
                    <Link key={link.href} href={link.href}>
                        <Card className="h-full border-2 border-primary/30 hover:border-primary hover:shadow-lg hover:shadow-primary/10 active:scale-95 transition-all group bg-white dark:bg-surface-dark cursor-pointer p-3 sm:p-4">
                            <div className="flex flex-col items-center text-center gap-2 sm:gap-3">
                                {/* Duotone Icon Container */}
                                <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center transition-all duration-300 ${link.href.includes('materi') ? 'bg-blue-100 dark:bg-blue-900/30 group-hover:bg-blue-600 text-blue-600 dark:text-blue-400 group-hover:text-white' :
                                    link.href.includes('tugas') ? 'bg-amber-100 dark:bg-amber-900/30 group-hover:bg-amber-600 text-amber-600 dark:text-amber-400 group-hover:text-white' :
                                        link.href.includes('ulangan') ? 'bg-red-100 dark:bg-red-900/30 group-hover:bg-red-600 text-red-600 dark:text-red-400 group-hover:text-white' :
                                            link.href.includes('kuis') ? 'bg-purple-100 dark:bg-purple-900/30 group-hover:bg-purple-600 text-purple-600 dark:text-purple-400 group-hover:text-white' :
                                                link.href.includes('bank-soal') ? 'bg-slate-100 dark:bg-slate-900/30 group-hover:bg-slate-600 text-slate-600 dark:text-slate-400 group-hover:text-white' :
                                                    'bg-green-100 dark:bg-green-900/30 group-hover:bg-green-600 text-green-600 dark:text-green-400 group-hover:text-white'
                                    }`}>
                                    <link.icon set="bold" primaryColor="currentColor" size={24} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-text-main dark:text-white group-hover:text-primary transition-colors text-sm sm:text-base">{link.label}</h3>
                                    <p className="text-[10px] sm:text-xs text-text-secondary dark:text-[#A8BC9F] mt-0.5 sm:mt-1 line-clamp-1">{link.sub}</p>
                                </div>
                            </div>
                        </Card>
                    </Link>
                ))}
            </div>

            {/* Academic Warnings */}
            {!loading && warnings && (warnings.teachingWarnings.length > 0 || warnings.homeroomWarnings.length > 0) && (
                <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center">
                            <Clock set="bold" size={16} />
                        </div>
                        <h2 className="text-xl font-bold text-text-main dark:text-white">Peringatan Akademik</h2>
                        <span className="text-sm font-medium text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full ml-2">Nilai Rata-Rata {'<'} {warnings.kkm}</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {warnings.teachingWarnings.length > 0 && (
                            <Card className="border-l-4 border-l-orange-500 hover:border-l-orange-500 hover:shadow-md transition-all">
                                <div className="p-1">
                                    <h3 className="font-bold text-text-main dark:text-white mb-3 text-sm flex items-center gap-2">
                                        <div className="text-orange-500 flex"><BookOpen set="bold" size="small" primaryColor="currentColor" /></div>
                                        Mata Pelajaran Anda ({warnings.teachingWarnings.length})
                                    </h3>
                                    <div className="max-h-48 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
                                        {warnings.teachingWarnings.map((warn, i) => (
                                            <div key={i} className="flex flex-col p-2.5 rounded-lg bg-orange-50 dark:bg-orange-950/20 border border-orange-100 dark:border-orange-900/30">
                                                <div className="flex justify-between items-start mb-1">
                                                    <span className="font-bold text-sm text-text-main dark:text-gray-100 line-clamp-1">{warn.student_name}</span>
                                                    <span className="px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 font-bold text-xs flex-shrink-0">
                                                        {warn.avg_score}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between items-center text-xs text-text-secondary dark:text-gray-400">
                                                    <span>{warn.class_name} • {warn.subject_name}</span>
                                                    <span>{warn.score_count} Nilai Masuk</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="mt-3 pt-3 border-t border-orange-100 dark:border-orange-900/30 text-right">
                                        <Link href="/dashboard/guru/nilai" className="text-xs font-bold text-orange-600 dark:text-orange-400 hover:underline">
                                            Kelola Nilai &rarr;
                                        </Link>
                                    </div>
                                </div>
                            </Card>
                        )}
                        {warnings.homeroomWarnings.length > 0 && (
                            <Card className="border-l-4 border-l-red-500 hover:border-l-red-500 hover:shadow-md transition-all">
                                <div className="p-1">
                                    <h3 className="font-bold text-text-main dark:text-white mb-3 text-sm flex items-center gap-2">
                                        <div className="text-red-500 flex"><School set="bold" size="small" primaryColor="currentColor" /></div>
                                        Kelas Perwalian ({warnings.homeroomWarnings.length})
                                    </h3>
                                    <div className="max-h-48 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
                                        {warnings.homeroomWarnings.map((warn, i) => (
                                            <div key={i} className="flex flex-col p-2.5 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30">
                                                <div className="flex justify-between items-start mb-1">
                                                    <span className="font-bold text-sm text-text-main dark:text-gray-100 line-clamp-1">{warn.student_name}</span>
                                                    <span className="px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 font-bold text-xs flex-shrink-0">
                                                        {warn.avg_score}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between items-center text-xs text-text-secondary dark:text-gray-400">
                                                    <span>{warn.class_name} • {warn.subject_name}</span>
                                                    <span>{warn.score_count} Nilai Masuk</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="mt-3 pt-3 border-t border-red-100 dark:border-red-900/30 text-right">
                                        <Link href="/dashboard/guru/wali-kelas" className="text-xs font-bold text-red-600 dark:text-red-400 hover:underline">
                                            Lihat Rekap Wali Kelas &rarr;
                                        </Link>
                                    </div>
                                </div>
                            </Card>
                        )}
                    </div>
                </div>
            )}

            {/* Teaching Assignments */}
            <div>
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-text-main dark:text-white">Kelas yang Diampu</h2>
                    {!loading && assignments.length > 0 && (
                        <span className="bg-primary/10 text-primary-dark dark:text-primary px-3 py-1 rounded-full text-xs font-bold">
                            {assignments.length} Kelas
                        </span>
                    )}
                </div>

                {loading ? (
                    <div className="flex items-center justify-center h-40">
                        <div className="animate-spin text-primary"><Loader2 className="w-8 h-8" /></div>
                    </div>
                ) : assignments.length === 0 ? (
                    <Card className="text-center py-12 border-dashed">
                        <div className="text-secondary mb-3"><BookOpen set="bold" primaryColor="currentColor" size={48} /></div>
                        <h3 className="text-lg font-bold text-text-main dark:text-white">Belum Ada Penugasan</h3>
                        <p className="text-text-secondary dark:text-[#A8BC9F]">Hubungi Administrator untuk mendapatkan akses kelas.</p>
                    </Card>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
                        {assignments.map((assignment) => (
                            <Link key={assignment.id} href={`/dashboard/guru/kelas/${assignment.class.id}`}>
                                <Card className="h-full hover:border-primary transition-all cursor-pointer group hover:shadow-md p-4">
                                    <div className="flex items-start justify-between mb-3">
                                        {/* Compact Icon */}
                                        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20">
                                            <span className="text-lg font-bold text-primary">
                                                {assignment.subject.name.charAt(0)}
                                            </span>
                                        </div>
                                        {assignment.academic_year.is_active && (
                                            <span className="px-2 py-0.5 bg-green-500/10 text-green-600 dark:text-green-400 text-[10px] font-bold rounded-full border border-green-500/20">
                                                Aktif
                                            </span>
                                        )}
                                    </div>

                                    <div className="space-y-1.5">
                                        <h3 className="text-sm font-bold text-text-main dark:text-white group-hover:text-primary transition-colors line-clamp-1">
                                            {assignment.subject.name}
                                        </h3>
                                        <div className="px-2 py-0.5 bg-secondary/10 dark:bg-white/5 rounded inline-block">
                                            <p className="text-xs font-medium text-text-main dark:text-white">
                                                {assignment.class.name}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="pt-2.5 mt-2.5 border-t border-secondary/10 dark:border-white/5 flex items-center justify-between">
                                        <span className="text-[10px] text-text-secondary dark:text-zinc-500">
                                            {assignment.academic_year.name}
                                        </span>
                                        <span className="text-primary font-bold text-[10px] flex items-center gap-1 group-hover:gap-1.5 transition-all">
                                            Masuk
                                            <div className="text-primary"><ArrowRight set="bold" primaryColor="currentColor" size={12} /></div>
                                        </span>
                                    </div>
                                </Card>
                            </Link>
                        ))}
                    </div>
                )}
            </div>

            {/* Jadwal Hari Ini */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <div className="text-primary"><Calendar set="bold" primaryColor="currentColor" size={22} /></div>
                        <h2 className="text-xl font-bold text-text-main dark:text-white">
                            Jadwal {showFullSchedule ? 'Minggu Ini' : 'Hari Ini'}
                        </h2>
                        <span className="text-sm text-text-secondary">({DAYS[todayDayNum]})</span>
                    </div>
                    {fullSchedule.length > 0 && (
                        <button
                            onClick={() => setShowFullSchedule(!showFullSchedule)}
                            className="text-primary text-sm font-semibold hover:text-primary-dark transition-colors flex items-center gap-1"
                        >
                            {showFullSchedule ? 'Hari Ini Saja' : 'Lihat Seminggu'}
                            <ArrowRight set="bold" primaryColor="currentColor" size={14} />
                        </button>
                    )}
                </div>

                {scheduleLoading ? (
                    <div className="flex items-center justify-center h-20">
                        <div className="animate-spin text-primary"><Loader2 className="w-6 h-6" /></div>
                    </div>
                ) : !showFullSchedule ? (
                    /* Today's Schedule */
                    todaySchedule.length === 0 ? (
                        <Card className="text-center py-8 border-dashed">
                            <div className="text-4xl mb-2">🎉</div>
                            <h3 className="text-base font-bold text-text-main dark:text-white">Tidak Ada Jadwal Hari Ini</h3>
                            <p className="text-sm text-text-secondary mt-1">Anda tidak memiliki jadwal mengajar hari ini.</p>
                        </Card>
                    ) : (
                        <div className="space-y-2">
                            {todaySchedule.map((entry) => {
                                const isCurrent = isCurrentPeriod(entry.time_start, entry.time_end)
                                return (
                                    <Card
                                        key={entry.id}
                                        className={`transition-all ${isCurrent
                                            ? 'border-2 border-primary bg-primary/5 dark:bg-primary/10 shadow-md shadow-primary/10'
                                            : 'border border-secondary/20'
                                            }`}
                                    >
                                        <div className="flex items-center gap-4">
                                            {/* Time */}
                                            <div className={`text-center min-w-[60px] ${isCurrent ? 'text-primary' : 'text-text-secondary'}`}>
                                                <div className="text-sm font-bold">{entry.time_start.slice(0, 5)}</div>
                                                <div className="text-[10px]">{entry.time_end.slice(0, 5)}</div>
                                            </div>

                                            {/* Divider */}
                                            <div className={`w-1 h-10 rounded-full ${isCurrent ? 'bg-primary' : 'bg-secondary/20'}`}></div>

                                            {/* Info */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <h4 className={`text-sm font-bold truncate ${isCurrent ? 'text-primary' : 'text-text-main dark:text-white'}`}>
                                                        {entry.subject?.name || 'Tidak ada mapel'}
                                                    </h4>
                                                    {isCurrent && (
                                                        <span className="flex-shrink-0 px-2 py-0.5 bg-primary text-white text-[10px] font-bold rounded-full animate-pulse">
                                                            SEKARANG
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-3 mt-0.5">
                                                    <span className="text-xs text-text-secondary">
                                                        {entry.schedule?.class?.name || ''}
                                                    </span>
                                                    {entry.room && (
                                                        <span className="text-xs text-text-secondary/70">📍 {entry.room}</span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Period badge */}
                                            <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${isCurrent
                                                ? 'bg-primary text-white'
                                                : 'bg-secondary/10 text-text-secondary'
                                                }`}>
                                                {entry.period}
                                            </div>
                                        </div>
                                    </Card>
                                )
                            })}
                        </div>
                    )
                ) : (
                    /* Full Week Schedule */
                    <div className="space-y-4">
                        {[1, 2, 3, 4, 5, 6].map(dayNum => {
                            const dayEntries = scheduleByDay[dayNum] || []
                            if (dayEntries.length === 0) return null
                            const isToday = dayNum === todayDayNum

                            return (
                                <Card key={dayNum} className={isToday ? 'border-2 border-primary/50' : ''}>
                                    <div className="flex items-center gap-2 mb-3">
                                        <h4 className={`text-sm font-bold ${isToday ? 'text-primary' : 'text-text-main dark:text-white'}`}>
                                            {DAYS[dayNum]}
                                        </h4>
                                        {isToday && (
                                            <span className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-bold rounded-full">
                                                Hari Ini
                                            </span>
                                        )}
                                    </div>
                                    <div className="space-y-1.5">
                                        {dayEntries.map(entry => {
                                            const isCurrent = isToday && isCurrentPeriod(entry.time_start, entry.time_end)
                                            return (
                                                <div
                                                    key={entry.id}
                                                    className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-all ${isCurrent
                                                        ? 'bg-primary/10 border border-primary/30'
                                                        : 'bg-secondary/5 dark:bg-white/5'
                                                        }`}
                                                >
                                                    <div className={`text-xs font-mono min-w-[90px] ${isCurrent ? 'text-primary font-bold' : 'text-text-secondary'}`}>
                                                        {entry.time_start.slice(0, 5)}–{entry.time_end.slice(0, 5)}
                                                    </div>
                                                    <div className={`w-0.5 h-5 rounded-full ${isCurrent ? 'bg-primary' : 'bg-secondary/20'}`}></div>
                                                    <div className="flex-1 min-w-0">
                                                        <span className={`text-sm font-semibold truncate ${isCurrent ? 'text-primary' : 'text-text-main dark:text-white'}`}>
                                                            {entry.subject?.name}
                                                        </span>
                                                        <span className="text-xs text-text-secondary ml-2">
                                                            {entry.schedule?.class?.name}
                                                        </span>
                                                    </div>
                                                    {isCurrent && (
                                                        <span className="flex-shrink-0 w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                                                    )}
                                                </div>
                                            )
                                        })}
                                    </div>
                                </Card>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}
