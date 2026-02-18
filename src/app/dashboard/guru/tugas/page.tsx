'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Modal, PageHeader, Button, EmptyState } from '@/components/ui'
import Card from '@/components/ui/Card'
import { Edit as PenTool, Graph as BarChart3, Calendar, TimeCircle as Clock, Plus, ChevronDown, Paper, Activity } from 'react-iconly'
import { Loader2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

interface TeachingAssignment {
    id: string
    subject: { name: string }
    class: { name: string }
}

interface Assignment {
    id: string
    title: string
    description: string | null
    type: string
    due_date: string | null
    created_at: string
    teaching_assignment: TeachingAssignment
}

export default function TugasPage() {
    const { user } = useAuth()
    const [assignments, setAssignments] = useState<Assignment[]>([])
    const [teachingAssignments, setTeachingAssignments] = useState<TeachingAssignment[]>([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [formData, setFormData] = useState({
        teaching_assignment_id: '',
        title: '',
        description: '',
        type: 'TUGAS',
        due_date: ''
    })
    const [saving, setSaving] = useState(false)

    const fetchData = async () => {
        try {
            const [taRes, assignmentsRes] = await Promise.all([
                fetch('/api/my-teaching-assignments'),
                fetch('/api/assignments')
            ])
            const [taData, assignmentsData] = await Promise.all([
                taRes.json(),
                assignmentsRes.json()
            ])

            const taArray = Array.isArray(taData) ? taData : []
            const assignmentsArray = Array.isArray(assignmentsData) ? assignmentsData : []

            const myAssignments = assignmentsArray.sort((a: Assignment, b: Assignment) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

            setTeachingAssignments(taArray)
            setAssignments(myAssignments)
        } catch (error) {
            console.error('Error:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (user) fetchData()
    }, [user])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)
        try {
            const res = await fetch('/api/assignments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    due_date: formData.due_date ? new Date(formData.due_date).toISOString() : null
                })
            })

            if (res.ok) {
                setShowModal(false)
                setFormData({ teaching_assignment_id: '', title: '', description: '', type: 'TUGAS', due_date: '' })
                fetchData()
            }
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Yakin ingin menghapus tugas ini?')) return
        await fetch(`/api/assignments/${id}`, { method: 'DELETE' })
        fetchData()
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title="Tugas"
                subtitle="Buat dan kelola tugas siswa"
                icon={<div className="text-amber-500"><PenTool set="bold" primaryColor="currentColor" size={24} /></div>}
                backHref="/dashboard/guru"
                action={
                    <Button onClick={() => setShowModal(true)} icon={
                        <div className="text-white"><Plus set="bold" primaryColor="currentColor" size={20} /></div>
                    }>
                        Buat Tugas
                    </Button>
                }
            />

            {loading ? (
                <div className="p-12 flex justify-center">
                    <div className="animate-spin text-primary"><Loader2 className="w-10 h-10" /></div>
                </div>
            ) : assignments.length === 0 ? (
                <EmptyState
                    icon={<div className="text-secondary"><Paper set="bold" primaryColor="currentColor" size={48} /></div>}
                    title="Belum Ada Tugas"
                    description="Buat tugas baru untuk siswa Anda"
                    action={<Button onClick={() => setShowModal(true)}>Buat Tugas</Button>}
                />
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {assignments.map((assignment) => (
                        <Card key={assignment.id} className="group hover:border-primary/30 transition-all hover:shadow-md">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                                        <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20">
                                            {assignment.type}
                                        </span>
                                        <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20">
                                            {assignment.teaching_assignment?.class?.name}
                                        </span>
                                        <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-green-500/10 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-500/20">
                                            {assignment.teaching_assignment?.subject?.name}
                                        </span>
                                    </div>
                                    <h3 className="text-xl font-bold text-text-main dark:text-white mb-1 group-hover:text-primary transition-colors">{assignment.title}</h3>
                                    <p className="text-sm text-text-secondary dark:text-zinc-400 mb-3 line-clamp-2">
                                        {assignment.description || 'Tidak ada deskripsi'}
                                    </p>
                                    <div className="flex items-center gap-4 text-xs text-text-secondary dark:text-zinc-500">
                                        <div className="flex items-center gap-1.5">
                                            <Calendar set="bold" primaryColor="currentColor" size={16} />
                                            <span>Dibuat: {new Date(assignment.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <Clock set="bold" primaryColor="currentColor" size={16} />
                                            <span>Deadline: {assignment.due_date ? new Date(assignment.due_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-2">
                                    <Link
                                        href={`/dashboard/guru/tugas/${assignment.id}/hasil`}
                                    >
                                        <Button variant="secondary" size="sm" className="w-full justify-center">
                                            <span className="text-secondary"><Activity set="bold" primaryColor="currentColor" size={16} /></span> Hasil
                                        </Button>
                                    </Link>
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        onClick={() => handleDelete(assignment.id)}
                                        className="w-full justify-center text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 border-red-200 dark:border-red-900/30"
                                    >
                                        Hapus
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            <Modal
                open={showModal}
                onClose={() => setShowModal(false)}
                title="Buat Tugas Baru"
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-text-main dark:text-white mb-2">Kelas & Mata Pelajaran</label>
                        <div className="relative">
                            <select
                                value={formData.teaching_assignment_id}
                                onChange={(e) => setFormData({ ...formData, teaching_assignment_id: e.target.value })}
                                className="w-full px-4 py-3 bg-secondary/5 border border-secondary/20 rounded-xl text-text-main dark:text-white focus:outline-none focus:ring-2 focus:ring-primary appearance-none"
                                required
                            >
                                <option value="">Pilih Kelas & Mapel</option>
                                {teachingAssignments.map((a) => (
                                    <option key={a.id} value={a.id}>{a.class.name} - {a.subject.name}</option>
                                ))}
                            </select>
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-text-secondary"><ChevronDown set="bold" primaryColor="currentColor" size={20} /></div>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-text-main dark:text-white mb-2">Judul Tugas</label>
                        <input
                            type="text"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            className="w-full px-4 py-3 bg-secondary/5 border border-secondary/20 rounded-xl text-text-main dark:text-white focus:outline-none focus:ring-2 focus:ring-primary placeholder-text-secondary/50"
                            placeholder="Contoh: Tugas Matematika Bab 1"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-text-main dark:text-white mb-2">Deskripsi (Opsional)</label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="w-full px-4 py-3 bg-secondary/5 border border-secondary/20 rounded-xl text-text-main dark:text-white focus:outline-none focus:ring-2 focus:ring-primary placeholder-text-secondary/50 min-h-[100px]"
                            placeholder="Jelaskan detail tugas di sini..."
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-text-main dark:text-white mb-2">Batas Waktu (Deadline)</label>
                        <input
                            type="datetime-local"
                            value={formData.due_date}
                            onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                            className="w-full px-4 py-3 bg-secondary/5 border border-secondary/20 rounded-xl text-text-main dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                    </div>

                    <div className="flex gap-3 pt-4 border-t border-secondary/10 mt-4">
                        <Button type="button" variant="secondary" onClick={() => setShowModal(false)} className="flex-1">
                            Batal
                        </Button>
                        <Button type="submit" loading={saving} className="flex-1">
                            Simpan Tugas
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    )
}
