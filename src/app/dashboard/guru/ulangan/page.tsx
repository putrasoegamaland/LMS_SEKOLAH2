'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Modal, PageHeader, Button, EmptyState } from '@/components/ui'
import Card from '@/components/ui/Card'
import { useAuth } from '@/contexts/AuthContext'
import { Paper as FileText, TimeCircle as Clock, Calendar, Plus, Lock, ShieldDone, User, Swap, Graph, Edit, Delete, ChevronDown, Document } from 'react-iconly'
import { Loader2, CheckSquare, Square, RefreshCw } from 'lucide-react'

interface Exam {
    id: string
    title: string
    description: string | null
    start_time: string
    duration_minutes: number
    is_active: boolean
    pending_publish: boolean
    is_randomized: boolean
    max_violations: number
    question_count: number
    created_at: string
    teaching_assignment: {
        id: string
        subject: { name: string, kkm: number }
        class: { id: string, name: string }
    }
}

interface TeachingAssignment {
    id: string
    subject: { id: string; name: string }
    class: { id: string; name: string }
}

export default function GuruUlanganPage() {
    const { user } = useAuth()
    const router = useRouter()
    const [exams, setExams] = useState<Exam[]>([])
    const [teachingAssignments, setTeachingAssignments] = useState<TeachingAssignment[]>([])
    const [submissionCounts, setSubmissionCounts] = useState<Record<string, number>>({})
    const [pendingGradingCounts, setPendingGradingCounts] = useState<Record<string, number>>({})
    const [studentCounts, setStudentCounts] = useState<Record<string, number>>({})
    const [loading, setLoading] = useState(true)
    const [showCreate, setShowCreate] = useState(false)
    const [creating, setCreating] = useState(false)
    const [form, setForm] = useState({
        teaching_assignment_id: '',
        title: '',
        description: '',
        start_time: '',
        duration_minutes: 60,
        is_randomized: true,
        max_violations: 3
    })

    // Remedial States
    const [showRemedial, setShowRemedial] = useState(false)
    const [remedialExam, setRemedialExam] = useState<Exam | null>(null)
    const [remedialStudents, setRemedialStudents] = useState<any[]>([])
    const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([])
    const [remedialMethod, setRemedialMethod] = useState<'ASLI' | 'BARU'>('ASLI')
    const [remedialLoading, setRemedialLoading] = useState(false)
    const [remedialStartTime, setRemedialStartTime] = useState('')

    useEffect(() => {
        fetchData()
    }, [user])

    const fetchData = async () => {
        if (!user) return

        try {
            const [examsRes, myAssignmentsRes, yearsRes] = await Promise.all([
                fetch('/api/exams'),
                fetch('/api/my-teaching-assignments'),
                fetch('/api/academic-years')
            ])

            let examsData = []
            if (examsRes.ok) {
                const data = await examsRes.json()
                examsData = Array.isArray(data) ? data : []
            }

            let myAssignments = []
            if (myAssignmentsRes.ok) {
                const data = await myAssignmentsRes.json()
                myAssignments = Array.isArray(data) ? data : []
            }

            // Get active academic year and fetch students with enrollment
            const yearsData = yearsRes.ok ? await yearsRes.json() : []
            const activeYear = Array.isArray(yearsData) ? yearsData.find((y: any) => y.is_active) : null
            if (activeYear) {
                try {
                    const studentsRes = await fetch(`/api/students?enrollment_year_id=${activeYear.id}`)
                    const studentsData = await studentsRes.json()
                    const studentsArray = Array.isArray(studentsData) ? studentsData : []
                    const counts: Record<string, number> = {}
                    studentsArray.forEach((s: any) => {
                        const classId = s.class?.id || s.class_id
                        if (classId) counts[classId] = (counts[classId] || 0) + 1
                    })
                    setStudentCounts(counts)
                } catch (e) {
                    console.error('Error fetching students:', e)
                }
            }

            setTeachingAssignments(myAssignments)

            // Filter exams by my teaching assignments
            const myExams = examsData.filter((e: Exam) =>
                myAssignments.some((ta: TeachingAssignment) => ta.id === e.teaching_assignment?.id)
            )
            setExams(myExams)

            // Fetch submission counts per exam
            const subCounts: Record<string, number> = {}
            const pendingCounts: Record<string, number> = {}
            await Promise.all(myExams.map(async (exam: Exam) => {
                try {
                    const res = await fetch(`/api/exam-submissions?exam_id=${exam.id}`)
                    if (res.ok) {
                        const subs = await res.json()
                        const subsArr = Array.isArray(subs) ? subs : []
                        subCounts[exam.id] = subsArr.filter((s: any) => s.is_submitted).length
                        pendingCounts[exam.id] = subsArr.filter((s: any) => s.is_submitted && !s.is_graded).length
                    }
                } catch { }
            }))
            setSubmissionCounts(subCounts)
            setPendingGradingCounts(pendingCounts)
        } catch (error) {
            console.error('Error fetching data:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleCreate = async () => {
        if (!form.teaching_assignment_id || !form.title || !form.start_time) return
        setCreating(true)
        try {
            const res = await fetch('/api/exams', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form)
            })
            if (res.ok) {
                const newExam = await res.json()
                setShowCreate(false)
                setForm({
                    teaching_assignment_id: '',
                    title: '',
                    description: '',
                    start_time: '',
                    duration_minutes: 60,
                    is_randomized: true,
                    max_violations: 3
                })
                router.push(`/dashboard/guru/ulangan/${newExam.id}`)
            }
        } finally {
            setCreating(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Hapus ulangan ini?')) return
        await fetch(`/api/exams/${id}`, { method: 'DELETE' })
        fetchData()
    }

    const handleOpenRemedial = async (exam: Exam) => {
        setRemedialExam(exam)
        setShowRemedial(true)
        setRemedialLoading(true)
        setSelectedStudentIds([])
        setRemedialMethod('ASLI')
        setRemedialStartTime('') // Need new start time for exam

        try {
            const classId = exam.teaching_assignment?.class?.id
            const kkm = exam.teaching_assignment?.subject?.kkm || 75

            if (!classId) throw new Error('Class ID missing')

            const [studentsRes, subsRes] = await Promise.all([
                fetch(`/api/students?class_id=${classId}`),
                fetch(`/api/exam-submissions?exam_id=${exam.id}&teacher_view=true`)
            ])
            const studentsData = await studentsRes.json()
            const subsData = await subsRes.json()

            const studentsWithScores = (Array.isArray(studentsData) ? studentsData : []).map((s: any) => {
                const sub = (Array.isArray(subsData) ? subsData : []).find((sub: any) => sub.student_id === s.id)
                let score = 0
                if (sub && sub.max_score > 0) {
                    score = (sub.total_score / sub.max_score) * 100
                }
                const isBelowKKM = score < kkm
                return {
                    ...s,
                    score: Math.round(score),
                    isBelowKKM
                }
            })

            // Sort by score
            studentsWithScores.sort((a, b) => a.score - b.score)

            setRemedialStudents(studentsWithScores)
            // Pre-select those below KKM
            setSelectedStudentIds(studentsWithScores.filter((s: any) => s.isBelowKKM).map((s: any) => s.user.id))
        } catch (error) {
            console.error('Error fetching remedial data:', error)
            alert('Gagal memuat data siswa untuk remedial')
        } finally {
            setRemedialLoading(false)
        }
    }

    const handleCreateRemedial = async () => {
        if (!remedialExam || selectedStudentIds.length === 0 || !remedialStartTime) return
        setCreating(true)
        try {
            const payload = {
                teaching_assignment_id: remedialExam.teaching_assignment.id,
                title: `[Remedial] ${remedialExam.title}`,
                description: `Remedial untuk ulangan: ${remedialExam.title}`,
                start_time: remedialStartTime,
                duration_minutes: remedialExam.duration_minutes,
                is_randomized: remedialExam.is_randomized,
                max_violations: remedialExam.max_violations,
                is_remedial: true,
                remedial_for_id: remedialExam.id,
                allowed_student_ids: selectedStudentIds,
                duplicate_questions: remedialMethod === 'ASLI'
            }

            const res = await fetch('/api/exams', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })

            if (res.ok) {
                const newExam = await res.json()
                setShowRemedial(false)
                fetchData() // Refresh list

                // If they require new questions, redirect to exam editor
                if (remedialMethod === 'BARU') {
                    router.push(`/dashboard/guru/ulangan/${newExam.id}`)
                }
            } else {
                alert('Gagal membuat ulangan remedial')
            }
        } finally {
            setCreating(false)
        }
    }

    const formatDateTime = (dateString: string) => {
        return new Date(dateString).toLocaleString('id-ID', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    const getExamStatus = (exam: Exam) => {
        const now = new Date()
        const startTime = new Date(exam.start_time)
        const endTime = new Date(startTime.getTime() + exam.duration_minutes * 60000)

        if (exam.pending_publish) return { label: '🔍 Under Review', color: 'bg-amber-500/10 text-amber-600 border-amber-200 dark:border-amber-500/20 dark:text-amber-400 font-bold' }
        if (!exam.is_active) return { label: 'Draft', color: 'bg-amber-500/10 text-amber-600 border-amber-200 dark:border-amber-500/20 dark:text-amber-400' }
        if (now < startTime) return { label: 'Terjadwal', color: 'bg-blue-500/10 text-blue-600 border-blue-200 dark:border-blue-500/20 dark:text-blue-400' }
        if (now >= startTime && now <= endTime) return { label: 'Berlangsung', color: 'bg-green-500/10 text-green-600 border-green-200 dark:border-green-500/20 dark:text-green-400' }
        return { label: 'Selesai', color: 'bg-secondary/10 text-text-secondary border-secondary/20' }
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title="Ulangan"
                subtitle="Buat ulangan dengan fitur pengawasan yang aman"
                icon={<div className="text-red-500"><Clock set="bold" primaryColor="currentColor" size={24} /></div>}
                backHref="/dashboard/guru"
                action={
                    <Button onClick={() => setShowCreate(true)} icon={
                        <div className="text-white"><Plus set="bold" primaryColor="currentColor" size={20} /></div>
                    }>
                        Buat Ulangan
                    </Button>
                }
            />

            {/* Info cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card padding="p-4" className="bg-gradient-to-br from-purple-500/5 to-purple-600/5 border-purple-200/50">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400 shadow-sm">
                            <Lock set="bold" primaryColor="currentColor" size={24} />
                        </div>
                        <div>
                            <h3 className="font-bold text-text-main dark:text-white">Tab Lock Mode</h3>
                            <p className="text-sm text-text-secondary">Siswa tidak bisa keluar tab</p>
                        </div>
                    </div>
                </Card>
                <Card padding="p-4" className="bg-gradient-to-br from-orange-500/5 to-orange-600/5 border-orange-200/50">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 dark:text-orange-400 shadow-sm">
                            <Clock set="bold" primaryColor="currentColor" size={24} />
                        </div>
                        <div>
                            <h3 className="font-bold text-text-main dark:text-white">Waktu & Durasi</h3>
                            <p className="text-sm text-text-secondary">Kontrol waktu yang ketat</p>
                        </div>
                    </div>
                </Card>
                <Card padding="p-4" className="bg-gradient-to-br from-cyan-500/5 to-cyan-600/5 border-cyan-200/50">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400 shadow-sm">
                            <ShieldDone set="bold" primaryColor="currentColor" size={24} />
                        </div>
                        <div>
                            <h3 className="font-bold text-text-main dark:text-white">Violation Limit</h3>
                            <p className="text-sm text-text-secondary">Auto-submit jika curang</p>
                        </div>
                    </div>
                </Card>
            </div>

            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="animate-spin text-primary"><Loader2 className="w-10 h-10" /></div>
                </div>
            ) : exams.length === 0 ? (
                <EmptyState
                    icon={<div className="text-secondary"><Document set="bold" primaryColor="currentColor" size={48} /></div>}
                    title="Belum Ada Ulangan"
                    description="Buat ulangan baru untuk kelas Anda dengan fitur pengawasan."
                    action={<Button onClick={() => setShowCreate(true)}>Buat Ulangan Sekarang</Button>}
                />
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {exams.map((exam) => {
                        const status = getExamStatus(exam)
                        return (
                            <Card key={exam.id} padding="p-5" className="group hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 transition-all">
                                <div className="flex flex-col h-full gap-4">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex flex-wrap items-center gap-2 mb-2">
                                                <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${status.color}`}>{status.label}</span>
                                                {(exam as any).is_remedial && (
                                                    <span className="px-2 py-0.5 bg-gradient-to-r from-orange-400 to-red-500 text-white text-[10px] font-bold rounded-full shadow-sm animate-pulse-slow">
                                                        REMEDIAL
                                                    </span>
                                                )}
                                                {exam.is_randomized && <span className="text-xs text-text-secondary flex items-center gap-1 bg-secondary/10 px-2 py-1 rounded-full"><Swap set="bold" primaryColor="currentColor" size={12} /> Acak</span>}
                                            </div>
                                            <h3 className="font-bold text-text-main dark:text-white text-lg group-hover:text-primary transition-colors line-clamp-2">{exam.title}</h3>
                                        </div>
                                        <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center text-text-secondary group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                                            <User set="bold" primaryColor="currentColor" size={20} />
                                        </div>
                                    </div>

                                    <p className="text-sm text-text-secondary dark:text-zinc-400 line-clamp-2 flex-grow">{exam.description || 'Tidak ada deskripsi'}</p>

                                    <div className="space-y-3 pt-4 border-t border-secondary/10">
                                        <div className="flex items-center text-xs text-text-secondary dark:text-zinc-500 mb-2">
                                            <Calendar set="bold" primaryColor="currentColor" size={14} />
                                            <span className="ml-1.5">Dibuat: {new Date(exam.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-xs text-text-secondary">
                                            <span>Kelas & Mapel</span>
                                            <div className="flex gap-1">
                                                <span className="px-2 py-1 bg-secondary/10 rounded font-bold text-text-main dark:text-white">{exam.teaching_assignment?.class?.name}</span>
                                                <span className="px-2 py-1 bg-primary/10 rounded font-bold text-primary">{exam.teaching_assignment?.subject?.name}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between text-xs text-text-secondary">
                                            <span>Waktu & Soal</span>
                                            <div className="flex gap-3">
                                                <span className="flex items-center gap-1 font-medium">
                                                    <Clock set="bold" primaryColor="currentColor" size={14} /> {exam.duration_minutes}m
                                                </span>
                                                <span className="flex items-center gap-1 font-medium">
                                                    <Edit set="bold" primaryColor="currentColor" size={14} /> {exam.question_count || 0}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="text-xs text-text-secondary text-right">
                                            <span className="inline-flex items-center gap-1"><Calendar set="bold" primaryColor="currentColor" size={14} /> {formatDateTime(exam.start_time)}</span>
                                        </div>
                                        {(() => {
                                            const classId = exam.teaching_assignment?.class?.id
                                            const total = classId ? (studentCounts[classId] || 0) : 0
                                            const submitted = submissionCounts[exam.id] || 0
                                            const pendingGrading = pendingGradingCounts[exam.id] || 0
                                            return (
                                                <>
                                                    <div className="flex items-center justify-between text-xs mt-1">
                                                        <span className="text-text-secondary">Pengumpulan</span>
                                                        <div className="flex items-center gap-2">
                                                            <span className={`font-bold ${submitted >= total && total > 0 ? 'text-green-600' : 'text-primary'}`}>{submitted}/{total}</span>
                                                            {total > 0 && (
                                                                <div className="w-16 bg-secondary/20 rounded-full h-1.5 overflow-hidden">
                                                                    <div
                                                                        className={`h-full rounded-full transition-all duration-500 ${submitted >= total ? 'bg-green-500' : submitted > 0 ? 'bg-primary' : 'bg-secondary/30'}`}
                                                                        style={{ width: `${Math.min(100, total > 0 ? (submitted / total) * 100 : 0)}%` }}
                                                                    />
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                    {pendingGrading > 0 && (
                                                        <Link href={`/dashboard/guru/ulangan/${exam.id}/hasil`} className="block">
                                                            <div className="flex items-center justify-between text-xs mt-1 px-2 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-lg hover:bg-amber-500/20 transition-colors cursor-pointer">
                                                                <span className="text-amber-600 dark:text-amber-400 font-medium">📝 Perlu Dikoreksi</span>
                                                                <span className="font-bold text-amber-600 dark:text-amber-400">{pendingGrading}</span>
                                                            </div>
                                                        </Link>
                                                    )}
                                                </>
                                            )
                                        })()}
                                    </div>

                                    <div className="flex flex-col gap-2 mt-auto pt-2">
                                        <div className="flex gap-2 w-full">
                                            {exam.is_active ? (
                                                <>
                                                    <Link href={`/dashboard/guru/ulangan/${exam.id}/hasil`} className="flex-1">
                                                        <Button variant="secondary" size="sm" className="w-full justify-center">
                                                            <span className="text-secondary"><Graph set="bold" primaryColor="currentColor" size={16} /></span> Hasil
                                                        </Button>
                                                    </Link>
                                                    {!(exam as any).is_remedial && status.label === 'Selesai' && (
                                                        <Button
                                                            variant="secondary"
                                                            size="sm"
                                                            onClick={() => handleOpenRemedial(exam)}
                                                            className="flex-1 justify-center bg-orange-100 dark:bg-orange-900/30 text-orange-600 hover:bg-orange-200 dark:hover:bg-orange-800/50 border-orange-200 dark:border-orange-800/50"
                                                        >
                                                            <RefreshCw className="w-4 h-4 mr-1 hidden sm:inline" /> Remedial
                                                        </Button>
                                                    )}
                                                </>
                                            ) : (
                                                <Button variant="secondary" size="sm" disabled className="w-full justify-center opacity-50 cursor-not-allowed">
                                                    <span className="text-secondary"><Graph set="bold" primaryColor="currentColor" size={16} /></span> Hasil
                                                </Button>
                                            )}
                                        </div>

                                        <div className="flex gap-2 w-full">
                                            <Link href={`/dashboard/guru/ulangan/${exam.id}`} className="flex-1">
                                                <Button variant="outline" size="sm" className="w-full justify-center border-primary/20 text-primary hover:bg-primary/5">
                                                    <Edit set="bold" primaryColor="currentColor" size={16} /> Edit
                                                </Button>
                                            </Link>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleDelete(exam.id)}
                                                className="flex-1 justify-center text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 border-red-200 dark:border-red-900/30"
                                            >
                                                <span className="text-red-500"><Delete set="bold" primaryColor="currentColor" size={16} /></span> Hapus
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        )
                    })}
                </div>
            )}

            {/* Create Modal */}
            <Modal
                open={showCreate}
                onClose={() => setShowCreate(false)}
                title="Buat Ulangan Baru"
            >
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-text-main dark:text-white mb-2">Kelas & Mata Pelajaran</label>
                        <div className="relative">
                            <select
                                value={form.teaching_assignment_id}
                                onChange={(e) => setForm({ ...form, teaching_assignment_id: e.target.value })}
                                className="w-full px-4 py-3 bg-secondary/5 border border-secondary/20 rounded-xl text-text-main dark:text-white focus:outline-none focus:ring-2 focus:ring-primary appearance-none"
                            >
                                <option value="">Pilih kelas...</option>
                                {teachingAssignments.map((ta) => (
                                    <option key={ta.id} value={ta.id}>
                                        {ta.class.name} - {ta.subject.name}
                                    </option>
                                ))}
                            </select>
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-text-secondary"><ChevronDown set="bold" primaryColor="currentColor" size={20} /></div>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-text-main dark:text-white mb-2">Judul Ulangan</label>
                        <input
                            type="text"
                            value={form.title}
                            onChange={(e) => setForm({ ...form, title: e.target.value })}
                            className="w-full px-4 py-3 bg-secondary/5 border border-secondary/20 rounded-xl text-text-main dark:text-white focus:outline-none focus:ring-2 focus:ring-primary placeholder-text-secondary/50"
                            placeholder="Contoh: UTS Matematika Bab 1-3"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-text-main dark:text-white mb-2">Deskripsi (Opsional)</label>
                        <textarea
                            value={form.description}
                            onChange={(e) => setForm({ ...form, description: e.target.value })}
                            className="w-full px-4 py-3 bg-secondary/5 border border-secondary/20 rounded-xl text-text-main dark:text-white focus:outline-none focus:ring-2 focus:ring-primary placeholder-text-secondary/50"
                            rows={2}
                            placeholder="Materi yang diujikan..."
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-text-main dark:text-white mb-2">Waktu Mulai</label>
                            <input
                                type="datetime-local"
                                value={form.start_time}
                                onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                                className="w-full px-4 py-3 bg-secondary/5 border border-secondary/20 rounded-xl text-text-main dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-text-main dark:text-white mb-2">Durasi (menit)</label>
                            <input
                                type="number"
                                value={form.duration_minutes}
                                onChange={(e) => setForm({ ...form, duration_minutes: parseInt(e.target.value) || 60 })}
                                className="w-full px-4 py-3 bg-secondary/5 border border-secondary/20 rounded-xl text-text-main dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                                min={5}
                                max={180}
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-text-main dark:text-white mb-2">Max Pelanggaran (auto-submit)</label>
                        <input
                            type="number"
                            value={form.max_violations}
                            onChange={(e) => setForm({ ...form, max_violations: parseInt(e.target.value) || 3 })}
                            className="w-full px-4 py-3 bg-secondary/5 border border-secondary/20 rounded-xl text-text-main dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                            min={1}
                            max={10}
                        />
                        <p className="text-xs text-text-secondary mt-1">Jika siswa keluar tab melebihi batas, ulangan auto-submit</p>
                    </div>
                    <div className="flex items-center gap-2 p-3 bg-secondary/5 rounded-xl border border-secondary/10">
                        <input
                            type="checkbox"
                            id="randomize"
                            checked={form.is_randomized}
                            onChange={(e) => setForm({ ...form, is_randomized: e.target.checked })}
                            className="w-5 h-5 rounded border-secondary/30 text-primary focus:ring-primary"
                        />
                        <label htmlFor="randomize" className="text-sm font-medium text-text-main dark:text-white cursor-pointer select-none">Acak urutan soal per siswa</label>
                    </div>

                    <div className="flex gap-3 pt-4 border-t border-secondary/10 mt-2">
                        <Button variant="secondary" onClick={() => setShowCreate(false)} className="flex-1">
                            Batal
                        </Button>
                        <Button
                            onClick={handleCreate}
                            loading={creating}
                            disabled={!form.teaching_assignment_id || !form.title || !form.start_time}
                            className="flex-1"
                        >
                            Buat & Tambah Soal
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Remedial Modal */}
            <Modal
                open={showRemedial}
                onClose={() => setShowRemedial(false)}
                title="Tugaskan Remedial Ulangan"
            >
                {remedialLoading ? (
                    <div className="flex justify-center py-10">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                ) : remedialExam ? (
                    <div className="space-y-6">
                        {/* Info Ulangan & KKM */}
                        <div className="bg-secondary/10 p-4 rounded-xl">
                            <h4 className="font-bold text-text-main dark:text-white mb-1">{remedialExam.title}</h4>
                            <div className="flex gap-4 text-sm text-text-secondary dark:text-zinc-400">
                                <span>Kls: <strong>{remedialExam.teaching_assignment?.class?.name}</strong></span>
                                <span>Mata Pelajaran: <strong>{remedialExam.teaching_assignment?.subject?.name}</strong></span>
                                <span>KKM: <strong className="text-red-500">{remedialExam.teaching_assignment?.subject?.kkm || 75}</strong></span>
                            </div>
                        </div>

                        {/* Waktu Mulai */}
                        <div>
                            <label className="block text-sm font-bold text-text-main dark:text-white mb-2">Waktu Mulai Ulangan Remedial</label>
                            <input
                                type="datetime-local"
                                value={remedialStartTime}
                                onChange={(e) => setRemedialStartTime(e.target.value)}
                                className="w-full px-4 py-3 bg-secondary/5 border border-secondary/20 rounded-xl text-text-main dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                        </div>

                        {/* Metode Soal */}
                        <div className="space-y-3">
                            <label className="block text-sm font-bold text-text-main dark:text-white">Metode Soal Remedial</label>
                            <div className="grid grid-cols-2 gap-3">
                                <label className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${remedialMethod === 'ASLI' ? 'border-primary bg-primary/5' : 'border-secondary/20 hover:border-primary/50'}`}>
                                    <input type="radio" name="method" checked={remedialMethod === 'ASLI'} onChange={() => setRemedialMethod('ASLI')} className="hidden" />
                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${remedialMethod === 'ASLI' ? 'border-primary' : 'border-secondary/50'}`}>
                                        {remedialMethod === 'ASLI' && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                                    </div>
                                    <span className="font-medium text-text-main dark:text-white">Gunakan Soal Asli</span>
                                </label>
                                <label className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${remedialMethod === 'BARU' ? 'border-primary bg-primary/5' : 'border-secondary/20 hover:border-primary/50'}`}>
                                    <input type="radio" name="method" checked={remedialMethod === 'BARU'} onChange={() => setRemedialMethod('BARU')} className="hidden" />
                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${remedialMethod === 'BARU' ? 'border-primary' : 'border-secondary/50'}`}>
                                        {remedialMethod === 'BARU' && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                                    </div>
                                    <span className="font-medium text-text-main dark:text-white">Buat Soal Baru</span>
                                </label>
                            </div>
                        </div>

                        {/* Pemilihan Siswa */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <label className="block text-sm font-bold text-text-main dark:text-white">
                                    Pilih Siswa ({selectedStudentIds.length} terpilih)
                                </label>
                                <button
                                    onClick={() => setSelectedStudentIds(remedialStudents.map(s => s.user.id))}
                                    className="text-xs text-primary font-bold hover:underline"
                                >
                                    Pilih Semua
                                </button>
                            </div>
                            <div className="max-h-60 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                                {remedialStudents.length === 0 ? (
                                    <p className="text-sm text-text-secondary text-center py-4">Tidak ada siswa di kelas ini</p>
                                ) : (
                                    remedialStudents.map((student) => {
                                        const isSelected = selectedStudentIds.includes(student.user.id)
                                        return (
                                            <div
                                                key={student.id}
                                                onClick={() => {
                                                    if (isSelected) {
                                                        setSelectedStudentIds(prev => prev.filter(id => id !== student.user.id))
                                                    } else {
                                                        setSelectedStudentIds(prev => [...prev, student.user.id])
                                                    }
                                                }}
                                                className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-colors ${isSelected ? 'border-primary bg-primary/5 dark:bg-primary/20' : 'border-secondary/20 bg-white dark:bg-surface-dark hover:bg-secondary/5'}`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    {isSelected ? <CheckSquare className="text-primary w-5 h-5" /> : <Square className="text-secondary/50 w-5 h-5" />}
                                                    <span className="font-medium text-text-main dark:text-white">{student.user.full_name}</span>
                                                </div>
                                                <div className={`px-2 py-1 rounded text-xs font-bold ${student.isBelowKKM ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' : 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'}`}>
                                                    Nilai: {student.score}
                                                </div>
                                            </div>
                                        )
                                    })
                                )}
                            </div>
                        </div>

                        <div className="flex gap-3 pt-4">
                            <Button variant="secondary" onClick={() => setShowRemedial(false)} className="flex-1">
                                Batal
                            </Button>
                            <Button
                                onClick={handleCreateRemedial}
                                disabled={creating || selectedStudentIds.length === 0 || !remedialStartTime}
                                loading={creating}
                                className="flex-1"
                            >
                                Proses Remedial
                            </Button>
                        </div>
                    </div>
                ) : null}
            </Modal>
        </div>
    )
}
