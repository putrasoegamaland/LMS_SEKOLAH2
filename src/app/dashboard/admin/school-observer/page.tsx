'use client'

import { useState, useEffect } from 'react'
import {
    LayoutDashboard,
    BookOpen,
    Clock,
    Users,
    Award,
    CheckCircle2,
    AlertCircle,
    ArrowRight,
    Search,
    Filter,
    Download,
    ChevronDown,
    MoreHorizontal,
    Star,
    Zap,
    TrendingUp,
    Timer
} from 'lucide-react'
import Card from '@/components/ui/Card'
import { useRouter } from 'next/navigation'

interface TeacherKPI {
    teacher_id: string
    name: string
    subjects: string[]

    // A: Activity
    a1_materials: number
    a2_ontime_assignment: number
    a3_ontime_exam: number
    a4_ontime_quiz: number
    a5_activity_score: number

    // B: Speed
    b1_grading_speed: number
    b2_grading_sla: number // %

    // C: Performance
    c1_perf_index: number
    c2_subject_benchmark: number
    c3_pass_ratio: number

    // D: Quality
    d1_coverage: number
    d2_feedback_quality: number
}

export default function SchoolObserverPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [teachers, setTeachers] = useState<TeacherKPI[]>([])
    const [selectedTeacher, setSelectedTeacher] = useState<TeacherKPI | null>(null)
    const [searchTerm, setSearchTerm] = useState('')

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        try {
            const res = await fetch('/api/admin/school-observer')
            if (res.ok) {
                const data = await res.json()
                setTeachers(data.data || [])
            }
        } catch (error) {
            console.error('Failed to fetch data', error)
        } finally {
            setLoading(false)
        }
    }

    // Client-side Scoring Calculation
    const calculateScore = (t: TeacherKPI) => {
        // Group A (35%): Avg(A2, A3) - A4 is sketchy so exclude for now, or include if > 0
        const a_score = (t.a2_ontime_assignment + t.a3_ontime_exam) / 2

        // Group B (25%): B2 (SLA Compliance)
        const b_score = t.b2_grading_sla

        // Group C (35%): Avg(C1, C3) - C1 is index (0-100), C3 is % (0-100)
        const c_score = (t.c1_perf_index + t.c3_pass_ratio) / 2

        // Group D (5%): Avg(D1, D2)
        const d_score = (t.d1_coverage + t.d2_feedback_quality) / 2

        // Total
        const total = (a_score * 0.35) + (b_score * 0.25) + (c_score * 0.35) + (d_score * 0.05)
        return Math.round(total)
    }

    const getScoreColor = (score: number) => {
        if (score >= 85) return 'text-green-600 bg-green-50 dark:bg-green-900/20'
        if (score >= 70) return 'text-blue-600 bg-blue-50 dark:bg-blue-900/20'
        if (score >= 50) return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20'
        return 'text-red-600 bg-red-50 dark:bg-red-900/20'
    }

    const filteredTeachers = teachers.filter(t =>
        t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.subjects.some(s => s.toLowerCase().includes(searchTerm.toLowerCase()))
    )

    // Calculate School Averages
    const avgScore = teachers.length > 0
        ? Math.round(teachers.reduce((sum, t) => sum + calculateScore(t), 0) / teachers.length)
        : 0

    return (
        <div className="space-y-8 p-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-text-main dark:text-white flex items-center gap-3">
                        <LayoutDashboard className="w-8 h-8 text-primary" />
                        School Observer
                    </h1>
                    <p className="text-text-secondary dark:text-zinc-400 mt-1">
                        Monitoring Kinerja Guru Berbasis Data (14 KPI)
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="px-4 py-2 bg-white dark:bg-surface-dark rounded-xl shadow-sm border border-secondary/10 flex items-center gap-3">
                        <span className="text-sm text-text-secondary">Rata-rata Sekolah</span>
                        <span className={`text-xl font-bold ${getScoreColor(avgScore).split(' ')[0]}`}>
                            {avgScore}
                        </span>
                    </div>
                    <button onClick={fetchData} className="p-2 hover:bg-secondary/10 rounded-lg transition-colors">
                        <Clock className="w-5 h-5 text-primary" />
                    </button>
                </div>
            </div>

            {/* Teacher List */}
            <Card className="overflow-hidden">
                <div className="p-4 border-b border-secondary/10 flex flex-col sm:flex-row justify-between gap-4">
                    <h2 className="text-lg font-bold text-text-main dark:text-white">Daftar Guru</h2>
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
                        <input
                            type="text"
                            placeholder="Cari guru atau mapel..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 rounded-lg bg-secondary/5 border-none focus:ring-2 focus:ring-primary/20 text-sm"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-secondary/5 dark:bg-white/5 text-xs uppercase tracking-wider text-text-secondary font-bold">
                                <th className="p-4">Guru</th>
                                <th className="p-4">Mapel</th>
                                <th className="p-4 text-center">Keaktifan (A)</th>
                                <th className="p-4 text-center">Grading (B)</th>
                                <th className="p-4 text-center">Performa (C)</th>
                                <th className="p-4 text-center">Final Score</th>
                                <th className="p-4"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-secondary/10">
                            {loading ? (
                                [...Array(5)].map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td className="p-4"><div className="h-4 bg-secondary/10 rounded w-32"></div></td>
                                        <td className="p-4"><div className="h-4 bg-secondary/10 rounded w-20"></div></td>
                                        <td className="p-4"><div className="h-4 bg-secondary/10 rounded w-12 mx-auto"></div></td>
                                        <td className="p-4"><div className="h-4 bg-secondary/10 rounded w-12 mx-auto"></div></td>
                                        <td className="p-4"><div className="h-4 bg-secondary/10 rounded w-12 mx-auto"></div></td>
                                        <td className="p-4"><div className="h-4 bg-secondary/10 rounded w-12 mx-auto"></div></td>
                                        <td className="p-4"></td>
                                    </tr>
                                ))
                            ) : filteredTeachers.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="p-8 text-center text-text-secondary">
                                        Tidak ada data guru ditemukan
                                    </td>
                                </tr>
                            ) : (
                                filteredTeachers.map((t) => {
                                    const score = calculateScore(t)
                                    return (
                                        <tr key={t.teacher_id} className="hover:bg-secondary/5 dark:hover:bg-white/5 transition-colors group">
                                            <td className="p-4">
                                                <div className="font-bold text-text-main dark:text-white text-sm">{t.name}</div>
                                                <div className="text-xs text-text-secondary mt-0.5">{t.teacher_id.substring(0, 8)}...</div>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex flex-wrap gap-1">
                                                    {t.subjects.slice(0, 2).map(s => (
                                                        <span key={s} className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300 text-[10px] font-bold">
                                                            {s}
                                                        </span>
                                                    ))}
                                                    {t.subjects.length > 2 && (
                                                        <span className="px-2 py-0.5 rounded-full bg-secondary/10 text-text-secondary text-[10px] font-bold">
                                                            +{t.subjects.length - 2}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="p-4 text-center">
                                                <span className={`font-bold ${t.a2_ontime_assignment >= 80 ? 'text-green-600' : 'text-amber-600'}`}>
                                                    {t.a2_ontime_assignment}%
                                                </span>
                                            </td>
                                            <td className="p-4 text-center">
                                                <span className={`font-bold ${t.b2_grading_sla >= 80 ? 'text-green-600' : 'text-amber-600'}`}>
                                                    {t.b2_grading_sla}%
                                                </span>
                                            </td>
                                            <td className="p-4 text-center">
                                                <span className={`font-bold ${t.c3_pass_ratio >= 75 ? 'text-green-600' : 'text-amber-600'}`}>
                                                    {t.c3_pass_ratio}%
                                                </span>
                                            </td>
                                            <td className="p-4 text-center">
                                                <span className={`inline-flex items-center justify-center w-10 h-10 rounded-full font-bold text-sm ${getScoreColor(score)}`}>
                                                    {score}
                                                </span>
                                            </td>
                                            <td className="p-4 text-right">
                                                <button
                                                    onClick={() => setSelectedTeacher(t)}
                                                    className="p-2 hover:bg-primary/10 text-primary rounded-lg transition-colors"
                                                >
                                                    <ArrowRight className="w-5 h-5" />
                                                </button>
                                            </td>
                                        </tr>
                                    )
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Detail Modal */}
            {selectedTeacher && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-surface-dark w-full max-w-5xl max-h-[90vh] rounded-3xl overflow-hidden shadow-2xl flex flex-col">

                        {/* Modal Header */}
                        <div className="p-6 border-b border-secondary/10 bg-surface-light dark:bg-surface-dark flex justify-between items-start">
                            <div>
                                <h2 className="text-2xl font-bold text-text-main dark:text-white flex items-center gap-2">
                                    {selectedTeacher.name}
                                    <span className={`ml-2 px-3 py-1 rounded-full text-sm ${getScoreColor(calculateScore(selectedTeacher))}`}>
                                        Score: {calculateScore(selectedTeacher)}
                                    </span>
                                </h2>
                                <div className="flex gap-2 mt-2">
                                    {selectedTeacher.subjects.map(s => (
                                        <span key={s} className="px-2 py-0.5 rounded text-xs bg-secondary/10 text-text-secondary font-medium">
                                            {s}
                                        </span>
                                    ))}
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedTeacher(null)}
                                className="p-2 hover:bg-secondary/10 rounded-full transition-colors font-bold text-xl leading-none text-text-secondary"
                            >
                                ×
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 overflow-y-auto space-y-8 bg-surface-ground/30 dark:bg-black/20">

                            {/* Group A: Activity */}
                            <div>
                                <h3 className="text-sm font-bold uppercase tracking-wider text-text-secondary mb-4 flex items-center gap-2">
                                    <Zap className="w-4 h-4 text-amber-500" />
                                    A. Keaktifan & Ketepatan Waktu (35%)
                                </h3>
                                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                    <KPICard title="Total Materi" value={selectedTeacher.a1_materials} label="Uploaded" />
                                    <KPICard title="Tugas On-Time" value={`${selectedTeacher.a2_ontime_assignment}%`} label="Success Rate" trend={selectedTeacher.a2_ontime_assignment >= 80 ? 'up' : 'down'} />
                                    <KPICard title="Ujian On-Time" value={`${selectedTeacher.a3_ontime_exam}%`} label="Success Rate" trend={selectedTeacher.a3_ontime_exam >= 80 ? 'up' : 'down'} />
                                    <KPICard title="Kuis On-Time" value={`${selectedTeacher.a4_ontime_quiz}%`} label="Success Rate" />
                                    <KPICard title="Activity Score" value={selectedTeacher.a5_activity_score} label="Points" highlight />
                                </div>
                            </div>

                            <div className="grid md:grid-cols-2 gap-8">
                                {/* Group B: Grading */}
                                <div>
                                    <h3 className="text-sm font-bold uppercase tracking-wider text-text-secondary mb-4 flex items-center gap-2">
                                        <Timer className="w-4 h-4 text-blue-500" />
                                        B. Kecepatan Grading (25%)
                                    </h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <KPICard title="Grading Speed" value={`${selectedTeacher.b1_grading_speed}h`} label="Avg Hours" />
                                        <KPICard title="SLA Compliance" value={`${selectedTeacher.b2_grading_sla}%`} label="Within 7 Days" trend={selectedTeacher.b2_grading_sla >= 80 ? 'up' : 'down'} highlight />
                                    </div>
                                </div>

                                {/* Group D: Quality */}
                                <div>
                                    <h3 className="text-sm font-bold uppercase tracking-wider text-text-secondary mb-4 flex items-center gap-2">
                                        <Award className="w-4 h-4 text-purple-500" />
                                        D. Kualitas Tambahan (5%)
                                    </h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <KPICard title="Grading Coverage" value={`${selectedTeacher.d1_coverage}%`} label="Rated / Submitted" />
                                        <KPICard title="Feedback Quality" value={`${selectedTeacher.d2_feedback_quality}%`} label="With Comments" trend={selectedTeacher.d2_feedback_quality >= 50 ? 'up' : 'down'} />
                                    </div>
                                </div>
                            </div>

                            {/* Group C: Performance */}
                            <div>
                                <h3 className="text-sm font-bold uppercase tracking-wider text-text-secondary mb-4 flex items-center gap-2">
                                    <TrendingUp className="w-4 h-4 text-green-500" />
                                    C. Performa Murid (35%)
                                </h3>
                                <div className="grid grid-cols-3 gap-4">
                                    <KPICard title="Performance Idx" value={selectedTeacher.c1_perf_index} label="Scale 0-100" />
                                    <KPICard title="Avg Pass Ratio" value={`${selectedTeacher.c3_pass_ratio}%`} label="Score > 75" trend={selectedTeacher.c3_pass_ratio >= 75 ? 'up' : 'down'} highlight />
                                    <KPICard title="Benchmark" value={`Top ${Math.round(selectedTeacher.c2_subject_benchmark)}%`} label="Vs Peers" />
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

function KPICard({ title, value, label, trend, highlight }: { title: string, value: string | number, label: string, trend?: 'up' | 'down', highlight?: boolean }) {
    return (
        <Card className={`p-4 flex flex-col justify-between h-full ${highlight ? 'border-primary/50 shadow-md bg-gradient-to-br from-primary/5 to-transparent' : 'bg-white dark:bg-surface-dark'}`}>
            <span className="text-xs font-bold text-text-secondary uppercase line-clamp-1 mb-2">{title}</span>
            <div>
                <div className="text-2xl font-bold text-text-main dark:text-white flex items-center gap-2">
                    {value}
                    {trend === 'up' && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                    {trend === 'down' && <AlertCircle className="w-4 h-4 text-red-500" />}
                </div>
                <div className="text-[10px] text-text-secondary mt-1">{label}</div>
            </div>
        </Card>
    )
}
