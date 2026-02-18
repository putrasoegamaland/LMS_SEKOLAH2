'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Modal, Button, PageHeader, EmptyState } from '@/components/ui'
import Card from '@/components/ui/Card'
import { TimeCircle as Clock, Document as FileText, Graph as BarChart3, Game as Brain, Calendar, Plus, Game, Graph, Edit, Swap } from 'react-iconly'
import { Loader2 } from 'lucide-react'

interface Quiz {
    id: string
    title: string
    description: string | null
    duration_minutes: number
    is_active: boolean
    is_randomized: boolean
    created_at: string
    teaching_assignment: {
        id: string
        subject: { name: string }
        class: { name: string }
    }
    questions: { count: number }[]
}

interface TeachingAssignment {
    id: string
    subject: { id: string; name: string }
    class: { id: string; name: string }
}

export default function GuruKuisPage() {
    const { user } = useAuth()
    const router = useRouter()
    const [quizzes, setQuizzes] = useState<Quiz[]>([])
    const [teachingAssignments, setTeachingAssignments] = useState<TeachingAssignment[]>([])
    const [loading, setLoading] = useState(true)
    const [showCreate, setShowCreate] = useState(false)
    const [creating, setCreating] = useState(false)
    const [form, setForm] = useState({
        teaching_assignment_id: '',
        title: '',
        description: '',
        duration_minutes: 30,
        is_randomized: true
    })

    useEffect(() => {
        fetchData()
    }, [user])

    const fetchData = async () => {
        if (!user) {
            return
        }

        try {
            const [quizzesRes, myAssignmentsRes] = await Promise.all([
                fetch('/api/quizzes'),
                fetch('/api/my-teaching-assignments')
            ])

            // Handle quiz response
            let quizzesData = []
            if (quizzesRes.ok) {
                const data = await quizzesRes.json()
                quizzesData = Array.isArray(data) ? data : []
            }

            // Handle assignments response
            let myAssignments = []
            if (myAssignmentsRes.ok) {
                const data = await myAssignmentsRes.json()
                myAssignments = Array.isArray(data) ? data : []
            }

            setTeachingAssignments(myAssignments)

            // Filter quizzes by my teaching assignments
            const myQuizzes = quizzesData.filter((q: Quiz) =>
                myAssignments.some((ta: TeachingAssignment) => ta.id === q.teaching_assignment?.id)
            )
            setQuizzes(myQuizzes)
        } catch (error) {
            console.error('Quiz Page - Error fetching data:', error)
            setTeachingAssignments([])
        } finally {
            setLoading(false)
        }
    }

    const handleCreate = async () => {
        if (!form.teaching_assignment_id || !form.title) return
        setCreating(true)
        try {
            const res = await fetch('/api/quizzes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form)
            })
            if (res.ok) {
                const newQuiz = await res.json()
                setShowCreate(false)
                setForm({ teaching_assignment_id: '', title: '', description: '', duration_minutes: 30, is_randomized: true })
                router.push(`/dashboard/guru/kuis/${newQuiz.id}`)
            }
        } finally {
            setCreating(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Hapus kuis ini?')) return
        await fetch(`/api/quizzes/${id}`, { method: 'DELETE' })
        fetchData()
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title="Kuis"
                subtitle="Buat dan kelola kuis dengan AI"
                backHref="/dashboard/guru"
                action={
                    <Button onClick={() => setShowCreate(true)} className="flex items-center gap-2">
                        <div className="text-white"><Plus set="bold" primaryColor="currentColor" size={20} /></div>
                        Buat Kuis
                    </Button>
                }
            />

            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="animate-spin text-primary"><Loader2 className="w-10 h-10" /></div>
                </div>
            ) : quizzes.length === 0 ? (
                <EmptyState
                    icon={<div className="text-secondary"><Game set="bold" primaryColor="currentColor" size={48} /></div>}
                    title="Belum Ada Kuis"
                    description="Buat kuis pertama Anda dengan bantuan AI!"
                    action={
                        <Button onClick={() => setShowCreate(true)}>
                            Buat Kuis Sekarang
                        </Button>
                    }
                />
            ) : (
                <div className="grid gap-4">
                    {quizzes.map((quiz) => (
                        <Card key={quiz.id} className="p-4">
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="font-bold text-text-main dark:text-white text-lg">{quiz.title}</h3>
                                        {quiz.is_active ? (
                                            <span className="px-2 py-0.5 bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 text-xs rounded-full">Aktif</span>
                                        ) : (
                                            <span className="px-2 py-0.5 bg-amber-100 dark:bg-yellow-500/20 text-amber-700 dark:text-yellow-500 text-xs rounded-full border border-amber-200 dark:border-yellow-500/20">Draft</span>
                                        )}
                                    </div>
                                    <p className="text-sm text-text-secondary dark:text-zinc-400 mb-2">{quiz.description || '-'}</p>
                                    <div className="flex items-center gap-4 text-xs text-text-secondary dark:text-zinc-500">
                                        <span className="flex items-center gap-1.5">
                                            <Calendar set="bold" primaryColor="currentColor" size={14} />
                                            Dibuat: {new Date(quiz.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                        </span>
                                        <span className="px-2 py-1 bg-secondary/10 rounded">{quiz.teaching_assignment?.subject?.name}</span>
                                        <span className="px-2 py-1 bg-secondary/10 rounded">{quiz.teaching_assignment?.class?.name}</span>
                                        <span className="flex items-center gap-1"><Clock set="bold" primaryColor="currentColor" size={14} /> {quiz.duration_minutes} menit</span>
                                        <span className="flex items-center gap-1"><Edit set="bold" primaryColor="currentColor" size={14} /> {quiz.questions?.[0]?.count || 0} soal</span>
                                        {quiz.is_randomized && <span className="flex items-center gap-1"><Swap set="bold" primaryColor="currentColor" size={14} /> Acak</span>}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {quiz.is_active && (
                                        <Link
                                            href={`/dashboard/guru/kuis/${quiz.id}/hasil`}
                                            className="px-3 py-1.5 bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 rounded-full hover:bg-green-200 dark:hover:bg-green-500/30 transition-colors text-sm font-medium"
                                        >
                                            <span className="flex items-center gap-1"><Graph set="bold" primaryColor="currentColor" size={16} /> Hasil</span>
                                        </Link>
                                    )}
                                    <Link
                                        href={`/dashboard/guru/kuis/${quiz.id}`}
                                        className="px-3 py-1.5 bg-primary/10 text-primary rounded-full hover:bg-primary/20 transition-colors text-sm font-medium"
                                    >
                                        Edit Soal
                                    </Link>
                                    <button
                                        onClick={() => handleDelete(quiz.id)}
                                        className="px-3 py-1.5 bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400 rounded-full hover:bg-red-200 dark:hover:bg-red-500/30 transition-colors text-sm font-medium"
                                    >
                                        Hapus
                                    </button>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            <Modal
                open={showCreate}
                onClose={() => setShowCreate(false)}
                title="Buat Kuis Baru"
            >
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-text-main dark:text-white mb-2">Kelas & Mata Pelajaran</label>
                        <select
                            value={form.teaching_assignment_id}
                            onChange={(e) => setForm({ ...form, teaching_assignment_id: e.target.value })}
                            className="w-full px-4 py-3 bg-secondary/5 border border-secondary/20 rounded-xl text-text-main dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                            disabled={teachingAssignments.length === 0}
                        >
                            <option value="">-- Pilih --</option>
                            {teachingAssignments.length === 0 ? (
                                <option disabled>Tidak ada kelas (Hubungi Admin)</option>
                            ) : (
                                teachingAssignments.map((ta) => (
                                    <option key={ta.id} value={ta.id}>
                                        {ta.class?.name || 'Unknown Class'} - {ta.subject?.name || 'Unknown Subject'}
                                    </option>
                                ))
                            )}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-text-main dark:text-white mb-2">Judul Kuis</label>
                        <input
                            type="text"
                            value={form.title}
                            onChange={(e) => setForm({ ...form, title: e.target.value })}
                            className="w-full px-4 py-3 bg-secondary/5 border border-secondary/20 rounded-xl text-text-main dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                            placeholder="Contoh: Kuis Bab 1 - Bilangan Bulat"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-text-main dark:text-white mb-2">Deskripsi (Opsional)</label>
                        <textarea
                            value={form.description}
                            onChange={(e) => setForm({ ...form, description: e.target.value })}
                            className="w-full px-4 py-3 bg-secondary/5 border border-secondary/20 rounded-xl text-text-main dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                            rows={2}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-text-main dark:text-white mb-2">Durasi (menit)</label>
                            <input
                                type="number"
                                value={form.duration_minutes}
                                onChange={(e) => setForm({ ...form, duration_minutes: parseInt(e.target.value) || 30 })}
                                className="w-full px-4 py-3 bg-secondary/5 border border-secondary/20 rounded-xl text-text-main dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                                min={5}
                            />
                        </div>
                        <div className="flex items-end">
                            <label className="flex items-center gap-2 cursor-pointer p-3 bg-secondary/5 border border-secondary/20 rounded-xl w-full">
                                <input
                                    type="checkbox"
                                    checked={form.is_randomized}
                                    onChange={(e) => setForm({ ...form, is_randomized: e.target.checked })}
                                    className="w-5 h-5 rounded bg-white border-secondary/30 text-primary focus:ring-primary"
                                />
                                <span className="text-text-main dark:text-white flex items-center gap-1"><Swap set="bold" primaryColor="currentColor" size={16} /> Acak Soal</span>
                            </label>
                        </div>
                    </div>
                    <div className="flex gap-3 pt-4">
                        <Button
                            variant="secondary"
                            onClick={() => setShowCreate(false)}
                            className="flex-1"
                        >
                            Batal
                        </Button>
                        <Button
                            onClick={handleCreate}
                            disabled={creating || !form.teaching_assignment_id || !form.title}
                            loading={creating}
                            className="flex-1"
                        >
                            Buat Kuis
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    )
}
