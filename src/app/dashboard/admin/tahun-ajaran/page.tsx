'use client'

import { useEffect, useState } from 'react'
import { Modal, Button, PageHeader, EmptyState } from '@/components/ui'
import Card from '@/components/ui/Card'
import { Calendar, Plus, CheckCircle, Clock, PlayCircle, AlertTriangle, Trash2, Loader2 } from 'lucide-react'
import { AcademicYear, AcademicYearStatus } from '@/lib/types'

interface FormData {
    name: string
    start_date: string
    end_date: string
    status: AcademicYearStatus
    is_active: boolean
}

interface RelatedData {
    classes: { count: number; names: string[] }
    teaching_assignments: number
    student_enrollments: number
    materials: number
    assignments: number
    quizzes: number
    exams: number
    submissions: number
    quiz_submissions: number
    exam_submissions: number
    total: number
}

const defaultFormData: FormData = {
    name: '',
    start_date: '',
    end_date: '',
    status: 'PLANNED',
    is_active: false
}

export default function TahunAjaranPage() {
    const [years, setYears] = useState<AcademicYear[]>([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [showCompleteModal, setShowCompleteModal] = useState(false)
    const [completingYear, setCompletingYear] = useState<AcademicYear | null>(null)
    const [editingYear, setEditingYear] = useState<AcademicYear | null>(null)
    const [formData, setFormData] = useState<FormData>(defaultFormData)
    const [saving, setSaving] = useState(false)

    // Delete confirmation states
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [showFinalDeleteModal, setShowFinalDeleteModal] = useState(false)
    const [deletingYear, setDeletingYear] = useState<AcademicYear | null>(null)
    const [relatedData, setRelatedData] = useState<RelatedData | null>(null)
    const [loadingRelated, setLoadingRelated] = useState(false)
    const [deleting, setDeleting] = useState(false)

    const fetchYears = async () => {
        try {
            const res = await fetch('/api/academic-years')
            const data = await res.json()
            setYears(Array.isArray(data) ? data : [])
        } catch (error) {
            console.error('Error:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchYears()
    }, [])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)
        try {
            const url = editingYear ? `/api/academic-years/${editingYear.id}` : '/api/academic-years'
            const method = editingYear ? 'PUT' : 'POST'

            // Sync status and is_active
            const submitData = {
                ...formData,
                is_active: formData.status === 'ACTIVE'
            }

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(submitData)
            })

            if (res.ok) {
                setShowModal(false)
                setEditingYear(null)
                setFormData(defaultFormData)
                fetchYears()
            }
        } finally {
            setSaving(false)
        }
    }

    const handleComplete = async () => {
        if (!completingYear) return
        setSaving(true)
        try {
            const res = await fetch(`/api/academic-years/${completingYear.id}/complete`, {
                method: 'PUT'
            })

            if (res.ok) {
                setShowCompleteModal(false)
                setCompletingYear(null)
                fetchYears()
            }
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Yakin ingin menghapus tahun ajaran ini?')) return
        await fetch(`/api/academic-years/${id}`, { method: 'DELETE' })
        fetchYears()
    }

    // Step 1: Open delete modal and fetch related data
    const openDeleteConfirm = async (year: AcademicYear) => {
        setDeletingYear(year)
        setRelatedData(null)
        setShowDeleteModal(true)
        setLoadingRelated(true)

        try {
            const res = await fetch(`/api/academic-years/${year.id}/related`)
            const data = await res.json()
            setRelatedData(data)
        } catch (error) {
            console.error('Error fetching related data:', error)
        } finally {
            setLoadingRelated(false)
        }
    }

    // Step 2: Show final confirmation modal
    const proceedToFinalConfirm = () => {
        setShowDeleteModal(false)
        setShowFinalDeleteModal(true)
    }

    // Step 3: Execute deletion
    const executeDelete = async () => {
        if (!deletingYear) return
        setDeleting(true)

        try {
            const res = await fetch(`/api/academic-years/${deletingYear.id}`, { method: 'DELETE' })
            if (res.ok) {
                setShowFinalDeleteModal(false)
                setDeletingYear(null)
                setRelatedData(null)
                fetchYears()
            } else {
                const error = await res.json()
                alert('Gagal menghapus: ' + (error.error || 'Terjadi kesalahan'))
            }
        } catch (error) {
            console.error('Error deleting:', error)
            alert('Gagal menghapus tahun ajaran')
        } finally {
            setDeleting(false)
        }
    }

    const cancelDelete = () => {
        setShowDeleteModal(false)
        setShowFinalDeleteModal(false)
        setDeletingYear(null)
        setRelatedData(null)
    }

    const openEdit = (year: AcademicYear) => {
        setEditingYear(year)
        setFormData({
            name: year.name,
            start_date: year.start_date || '',
            end_date: year.end_date || '',
            status: year.status || (year.is_active ? 'ACTIVE' : 'PLANNED'),
            is_active: year.is_active
        })
        setShowModal(true)
    }

    const openAdd = () => {
        setEditingYear(null)
        setFormData(defaultFormData)
        setShowModal(true)
    }

    const openComplete = (year: AcademicYear) => {
        setCompletingYear(year)
        setShowCompleteModal(true)
    }

    const getStatusBadge = (year: AcademicYear) => {
        const status = year.status || (year.is_active ? 'ACTIVE' : 'PLANNED')
        switch (status) {
            case 'ACTIVE':
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-500/10 text-green-600 dark:text-green-400 rounded-full text-xs font-bold border border-green-500/20">
                        <PlayCircle className="w-3 h-3" />
                        Aktif
                    </span>
                )
            case 'COMPLETED':
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-full text-xs font-bold border border-blue-500/20">
                        <CheckCircle className="w-3 h-3" />
                        Selesai
                    </span>
                )
            default:
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-full text-xs font-bold border border-amber-500/20">
                        <Clock className="w-3 h-3" />
                        Direncanakan
                    </span>
                )
        }
    }

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return '-'
        return new Date(dateStr).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        })
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title="Tahun Ajaran"
                subtitle="Kelola daftar tahun ajaran sekolah"
                backHref="/dashboard/admin"
                icon={<Calendar className="w-6 h-6 text-amber-500" />}
                action={
                    <Button onClick={openAdd} icon={<Plus className="w-5 h-5" />}>
                        Tambah Tahun Ajaran
                    </Button>
                }
            />

            <Card className="overflow-hidden p-0">
                {loading ? (
                    <div className="p-12 flex justify-center">
                        <div className="animate-spin text-primary"><Calendar className="w-8 h-8" /></div>
                    </div>
                ) : years.length === 0 ? (
                    <div className="p-6">
                        <EmptyState
                            icon={<Calendar className="w-12 h-12 text-secondary" />}
                            title="Belum Ada Tahun Ajaran"
                            description="Tambahkan tahun ajaran untuk memulai"
                            action={<Button onClick={openAdd}>Tambah Tahun Ajaran</Button>}
                        />
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-secondary/10 dark:bg-white/5 border-b border-secondary/20">
                                <tr>
                                    <th className="px-6 py-4 text-left text-sm font-bold text-text-main dark:text-white uppercase tracking-wider">Nama</th>
                                    <th className="px-6 py-4 text-left text-sm font-bold text-text-main dark:text-white uppercase tracking-wider">Periode</th>
                                    <th className="px-6 py-4 text-left text-sm font-bold text-text-main dark:text-white uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-4 text-right text-sm font-bold text-text-main dark:text-white uppercase tracking-wider">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-secondary/20 dark:divide-white/5">
                                {years.map((year) => (
                                    <tr key={year.id} className="hover:bg-secondary/5 transition-colors">
                                        <td className="px-6 py-4 text-text-main dark:text-white font-medium">{year.name}</td>
                                        <td className="px-6 py-4 text-text-secondary text-sm">
                                            {formatDate(year.start_date)} - {formatDate(year.end_date)}
                                        </td>
                                        <td className="px-6 py-4">
                                            {getStatusBadge(year)}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                {/* Complete button - only show for ACTIVE years */}
                                                {(year.status === 'ACTIVE' || year.is_active) && (
                                                    <button
                                                        onClick={() => openComplete(year)}
                                                        className="px-3 py-1.5 rounded-lg bg-green-500/10 text-green-600 hover:bg-green-500/20 text-xs font-medium transition-colors"
                                                        title="Selesaikan Tahun Ajaran"
                                                    >
                                                        Selesaikan
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => openEdit(year)}
                                                    className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 flex items-center justify-center transition-colors"
                                                    title="Edit"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                    </svg>
                                                </button>
                                                <button
                                                    onClick={() => openDeleteConfirm(year)}
                                                    className="w-8 h-8 rounded-lg bg-red-500/10 text-red-600 hover:bg-red-500/20 flex items-center justify-center transition-colors"
                                                    title="Hapus"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            {/* Add/Edit Modal */}
            <Modal
                open={showModal}
                onClose={() => setShowModal(false)}
                title={editingYear ? '✏️ Edit Tahun Ajaran' : '➕ Tambah Tahun Ajaran'}
            >
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-bold text-text-main dark:text-white mb-2">Nama Tahun Ajaran</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-4 py-3 bg-secondary/5 border border-secondary/20 rounded-xl text-text-main dark:text-white focus:outline-none focus:ring-2 focus:ring-primary placeholder-text-secondary/50 transition-all"
                            placeholder="Contoh: 2024/2025"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-text-main dark:text-white mb-2">Tanggal Mulai</label>
                        <input
                            type="date"
                            value={formData.start_date}
                            onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                            className="w-full px-4 py-3 bg-secondary/5 border border-secondary/20 rounded-xl text-text-main dark:text-white focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                        />
                        <p className="text-xs text-text-secondary mt-2">
                            Tanggal selesai akan otomatis terisi saat tahun ajaran diselesaikan.
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-text-main dark:text-white mb-2">Status</label>
                        <select
                            value={formData.status}
                            onChange={(e) => setFormData({ ...formData, status: e.target.value as AcademicYearStatus })}
                            className="w-full px-4 py-3 bg-secondary/5 border border-secondary/20 rounded-xl text-text-main dark:text-white focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                            disabled={editingYear?.status === 'COMPLETED'}
                        >
                            <option value="PLANNED">🕐 Direncanakan</option>
                            <option value="ACTIVE">▶️ Aktif (Sedang Berjalan)</option>
                            {editingYear?.status === 'COMPLETED' && (
                                <option value="COMPLETED">✅ Selesai</option>
                            )}
                        </select>
                        <p className="text-xs text-text-secondary mt-2">
                            Hanya boleh ada 1 tahun ajaran yang aktif. Jika memilih "Aktif", tahun ajaran lain akan otomatis menjadi "Selesai".
                        </p>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <Button type="button" variant="secondary" onClick={() => setShowModal(false)} className="flex-1">
                            Batal
                        </Button>
                        <Button type="submit" loading={saving} className="flex-1">
                            Simpan Perubahan
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Complete Confirmation Modal */}
            <Modal
                open={showCompleteModal}
                onClose={() => setShowCompleteModal(false)}
                title="⚠️ Selesaikan Tahun Ajaran"
            >
                <div className="space-y-4">
                    <p className="text-text-main dark:text-white">
                        Apakah Anda yakin ingin menyelesaikan tahun ajaran <strong>{completingYear?.name}</strong>?
                    </p>
                    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4 rounded-xl">
                        <p className="text-sm text-amber-800 dark:text-amber-200">
                            <strong>Perhatian:</strong> Setelah diselesaikan:
                        </p>
                        <ul className="text-sm text-amber-700 dark:text-amber-300 mt-2 list-disc list-inside space-y-1">
                            <li>Status akan berubah menjadi "Selesai"</li>
                            <li>Tanggal selesai akan diset ke hari ini</li>
                            <li>Tidak ada tahun ajaran aktif sampai Anda membuat/mengaktifkan yang baru</li>
                        </ul>
                    </div>
                    <div className="flex gap-3 pt-2">
                        <Button type="button" variant="secondary" onClick={() => setShowCompleteModal(false)} className="flex-1">
                            Batal
                        </Button>
                        <Button onClick={handleComplete} loading={saving} className="flex-1">
                            Ya, Selesaikan
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Delete Confirmation Modal - Step 1: Show related data */}
            <Modal
                open={showDeleteModal}
                onClose={cancelDelete}
                title="⚠️ Hapus Tahun Ajaran"
            >
                <div className="space-y-4">
                    <p className="text-text-main dark:text-white">
                        Anda akan menghapus tahun ajaran <strong className="text-red-600">{deletingYear?.name}</strong>
                    </p>

                    {loadingRelated ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="w-8 h-8 text-primary animate-spin" />
                            <span className="ml-2 text-text-secondary">Memuat data terkait...</span>
                        </div>
                    ) : relatedData && relatedData.total > 0 ? (
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 rounded-xl">
                            <div className="flex items-start gap-2 mb-3">
                                <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                                <p className="text-sm font-bold text-red-800 dark:text-red-200">
                                    Data berikut akan TERHAPUS PERMANEN:
                                </p>
                            </div>
                            <ul className="text-sm text-red-700 dark:text-red-300 space-y-2 ml-7">
                                {relatedData.classes.count > 0 && (
                                    <li className="flex justify-between">
                                        <span>📚 Kelas</span>
                                        <span className="font-bold">{relatedData.classes.count} kelas</span>
                                    </li>
                                )}
                                {relatedData.teaching_assignments > 0 && (
                                    <li className="flex justify-between">
                                        <span>👨‍🏫 Penugasan Mengajar</span>
                                        <span className="font-bold">{relatedData.teaching_assignments}</span>
                                    </li>
                                )}
                                {relatedData.student_enrollments > 0 && (
                                    <li className="flex justify-between">
                                        <span>📝 Enrollment Siswa</span>
                                        <span className="font-bold">{relatedData.student_enrollments}</span>
                                    </li>
                                )}
                                {relatedData.materials > 0 && (
                                    <li className="flex justify-between">
                                        <span>📖 Materi</span>
                                        <span className="font-bold">{relatedData.materials}</span>
                                    </li>
                                )}
                                {relatedData.assignments > 0 && (
                                    <li className="flex justify-between">
                                        <span>📋 Tugas</span>
                                        <span className="font-bold">{relatedData.assignments}</span>
                                    </li>
                                )}
                                {relatedData.quizzes > 0 && (
                                    <li className="flex justify-between">
                                        <span>❓ Kuis</span>
                                        <span className="font-bold">{relatedData.quizzes}</span>
                                    </li>
                                )}
                                {relatedData.exams > 0 && (
                                    <li className="flex justify-between">
                                        <span>📝 Ulangan</span>
                                        <span className="font-bold">{relatedData.exams}</span>
                                    </li>
                                )}
                                {(relatedData.submissions + relatedData.quiz_submissions + relatedData.exam_submissions) > 0 && (
                                    <li className="flex justify-between border-t border-red-200 dark:border-red-700 pt-2 mt-2">
                                        <span>📊 Total Submission/Nilai</span>
                                        <span className="font-bold">
                                            {relatedData.submissions + relatedData.quiz_submissions + relatedData.exam_submissions}
                                        </span>
                                    </li>
                                )}
                            </ul>
                            {relatedData.classes.names.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-red-200 dark:border-red-700">
                                    <p className="text-xs text-red-600 dark:text-red-400 font-medium mb-1">Daftar Kelas:</p>
                                    <p className="text-xs text-red-500 dark:text-red-300">
                                        {relatedData.classes.names.slice(0, 5).join(', ')}
                                        {relatedData.classes.names.length > 5 && ` ... dan ${relatedData.classes.names.length - 5} lainnya`}
                                    </p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4 rounded-xl">
                            <p className="text-sm text-green-700 dark:text-green-300">
                                ✅ Tidak ada data terkait yang akan terhapus.
                            </p>
                        </div>
                    )}

                    <div className="flex gap-3 pt-2">
                        <Button type="button" variant="secondary" onClick={cancelDelete} className="flex-1">
                            Batal
                        </Button>
                        <Button
                            onClick={proceedToFinalConfirm}
                            className="flex-1 bg-red-600 hover:bg-red-700 text-white border-0"
                            disabled={loadingRelated}
                        >
                            Lanjutkan Hapus
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Delete Confirmation Modal - Step 2: Final confirmation */}
            <Modal
                open={showFinalDeleteModal}
                onClose={cancelDelete}
                title="🚨 Konfirmasi Akhir"
            >
                <div className="space-y-4">
                    <div className="bg-red-100 dark:bg-red-900/30 border-2 border-red-500 p-6 rounded-xl text-center">
                        <AlertTriangle className="w-16 h-16 text-red-600 mx-auto mb-4" />
                        <p className="text-lg font-bold text-red-800 dark:text-red-200 mb-2">
                            APAKAH ANDA YAKIN?
                        </p>
                        <p className="text-text-main dark:text-white">
                            Menghapus tahun ajaran <strong className="text-red-600">{deletingYear?.name}</strong>
                        </p>
                        {relatedData && relatedData.total > 0 && (
                            <p className="text-sm text-red-600 dark:text-red-400 mt-2 font-bold">
                                {relatedData.total} data terkait akan DIHAPUS PERMANEN
                            </p>
                        )}
                    </div>

                    <p className="text-sm text-text-secondary text-center">
                        Tindakan ini <strong>TIDAK DAPAT DIBATALKAN</strong>
                    </p>

                    <div className="flex gap-3 pt-2">
                        <Button type="button" variant="secondary" onClick={cancelDelete} className="flex-1">
                            Batalkan
                        </Button>
                        <Button
                            onClick={executeDelete}
                            loading={deleting}
                            className="flex-1 bg-red-600 hover:bg-red-700 text-white border-0"
                        >
                            Ya, Hapus Sekarang
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    )
}
