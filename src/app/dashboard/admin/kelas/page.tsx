'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Modal, Button, PageHeader, EmptyState } from '@/components/ui'
import Card from '@/components/ui/Card'
import { School, Plus } from 'lucide-react'
import { Class, AcademicYear, SchoolLevel } from '@/lib/types'

interface Student {
    id: string
    nisn: string
    user: {
        full_name: string
        email: string
    }
}

export default function KelasPage() {
    const [classes, setClasses] = useState<Class[]>([])
    const [academicYears, setAcademicYears] = useState<AcademicYear[]>([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [editingClass, setEditingClass] = useState<Class | null>(null)
    const [formData, setFormData] = useState({ name: '', academic_year_id: '', grade_level: null as number | null, school_level: null as SchoolLevel | null })
    const [saving, setSaving] = useState(false)

    // Filter state
    const [gradeFilter, setGradeFilter] = useState<number | null>(null)

    // Students modal state
    const [showStudentsModal, setShowStudentsModal] = useState(false)
    const [selectedClass, setSelectedClass] = useState<Class | null>(null)
    const [students, setStudents] = useState<Student[]>([])
    const [loadingStudents, setLoadingStudents] = useState(false)

    const fetchData = async () => {
        try {
            const classesUrl = gradeFilter
                ? `/api/classes?grade_level=${gradeFilter}`
                : '/api/classes'

            const [classesRes, yearsRes] = await Promise.all([
                fetch(classesUrl),
                fetch('/api/academic-years')
            ])
            const [classesData, yearsData] = await Promise.all([
                classesRes.json(),
                yearsRes.json()
            ])
            setClasses(classesData)
            setAcademicYears(yearsData)
        } catch (error) {
            console.error('Error:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchData()
    }, [])

    useEffect(() => {
        setLoading(true)
        fetchData()
    }, [gradeFilter])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)
        try {
            const url = editingClass ? `/api/classes/${editingClass.id}` : '/api/classes'
            const method = editingClass ? 'PUT' : 'POST'

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            })

            if (res.ok) {
                setShowModal(false)
                setEditingClass(null)
                setFormData({ name: '', academic_year_id: '', grade_level: null, school_level: null })
                fetchData()
            }
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Yakin ingin menghapus kelas ini?')) return
        await fetch(`/api/classes/${id}`, { method: 'DELETE' })
        fetchData()
    }

    const openEdit = (cls: Class) => {
        setEditingClass(cls)
        setFormData({ name: cls.name, academic_year_id: cls.academic_year_id, grade_level: cls.grade_level, school_level: cls.school_level })
        setShowModal(true)
    }

    const openAdd = () => {
        setEditingClass(null)
        const activeYear = academicYears.find(y => y.is_active)
        setFormData({ name: '', academic_year_id: activeYear?.id || '', grade_level: null, school_level: null })
        setShowModal(true)
    }

    const viewStudents = async (cls: Class) => {
        setSelectedClass(cls)
        setShowStudentsModal(true)
        setLoadingStudents(true)
        try {
            const res = await fetch(`/api/students?class_id=${cls.id}`)
            const data = await res.json()
            setStudents(Array.isArray(data) ? data : [])
        } catch (error) {
            console.error('Error fetching students:', error)
            setStudents([])
        } finally {
            setLoadingStudents(false)
        }
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title="Kelas"
                subtitle="Kelola daftar kelas dan siswa"
                backHref="/dashboard/admin"
                icon={<School className="w-6 h-6 text-purple-500" />}
                action={
                    <Button onClick={openAdd} icon={<Plus className="w-5 h-5" />}>
                        Tambah Kelas
                    </Button>
                }
            />

            {/* Filter Section */}
            <div className="bg-white dark:bg-surface-dark border border-secondary/20 rounded-xl p-4 shadow-sm">
                <div className="flex items-center gap-4">
                    <label className="text-sm font-bold text-text-main dark:text-white whitespace-nowrap">
                        Filter Tingkat:
                    </label>
                    <div className="relative flex-1 max-w-xs">
                        <select
                            value={gradeFilter || ''}
                            onChange={(e) => setGradeFilter(e.target.value ? parseInt(e.target.value) : null)}
                            className="w-full px-4 py-2.5 bg-secondary/5 border border-secondary/20 rounded-xl text-text-main dark:text-white focus:outline-none focus:ring-2 focus:ring-primary appearance-none"
                        >
                            <option value="">Semua Tingkat</option>
                            <option value="1">Kelas 1</option>
                            <option value="2">Kelas 2</option>
                            <option value="3">Kelas 3</option>
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-text-secondary">
                            ▼
                        </div>
                    </div>
                    {gradeFilter && (
                        <button
                            onClick={() => setGradeFilter(null)}
                            className="px-4 py-2.5 text-sm font-medium text-text-secondary hover:text-text-main dark:hover:text-white transition-colors"
                        >
                            Reset Filter
                        </button>
                    )}
                    {gradeFilter && (
                        <div className="text-sm text-text-secondary dark:text-zinc-400">
                            Menampilkan: <span className="font-bold text-primary">Kelas {gradeFilter}</span> ({classes.length} kelas)
                        </div>
                    )}
                </div>
            </div>

            <Card className="overflow-hidden p-0">
                {loading ? (
                    <div className="p-12 flex justify-center">
                        <div className="animate-spin text-primary"><School className="w-8 h-8" /></div>
                    </div>
                ) : classes.length === 0 ? (
                    <div className="p-6">
                        <EmptyState
                            icon={<School className="w-12 h-12 text-secondary" />}
                            title="Belum Ada Kelas"
                            description="Tambahkan kelas untuk memulai"
                            action={<Button onClick={openAdd}>Tambah Kelas</Button>}
                        />
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-secondary/10 dark:bg-white/5 border-b border-secondary/20">
                                <tr>
                                    <th className="px-6 py-4 text-left text-sm font-bold text-text-main dark:text-white uppercase tracking-wider">Nama Kelas</th>
                                    <th className="px-6 py-4 text-left text-sm font-bold text-text-main dark:text-white uppercase tracking-wider">Jenjang</th>
                                    <th className="px-6 py-4 text-left text-sm font-bold text-text-main dark:text-white uppercase tracking-wider">Tingkat</th>
                                    <th className="px-6 py-4 text-left text-sm font-bold text-text-main dark:text-white uppercase tracking-wider">Tahun Ajaran</th>
                                    <th className="px-6 py-4 text-right text-sm font-bold text-text-main dark:text-white uppercase tracking-wider">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-secondary/20 dark:divide-white/5">
                                {classes.map((cls) => (
                                    <tr key={cls.id} className="hover:bg-secondary/5 transition-colors">
                                        <td className="px-6 py-4 text-text-main dark:text-white font-medium">{cls.name}</td>
                                        <td className="px-6 py-4">
                                            {cls.school_level ? (
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${cls.school_level === 'SMP' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                                                        'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                                    }`}>
                                                    {cls.school_level}
                                                </span>
                                            ) : (
                                                <span className="text-text-secondary dark:text-zinc-500 text-sm">-</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            {cls.grade_level ? (
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${cls.school_level === 'SMP' && cls.grade_level === 1 ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                                                        cls.school_level === 'SMP' && cls.grade_level === 2 ? 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400' :
                                                            cls.school_level === 'SMP' && cls.grade_level === 3 ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' :
                                                                cls.school_level === 'SMA' && cls.grade_level === 1 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                                                    cls.school_level === 'SMA' && cls.grade_level === 2 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                                                                        cls.school_level === 'SMA' && cls.grade_level === 3 ? 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400' :
                                                                            'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'
                                                    }`}>
                                                    {cls.school_level === 'SMP' ? `MP${cls.grade_level}` : cls.school_level === 'SMA' ? `MA${cls.grade_level}` : `Tingkat ${cls.grade_level}`}
                                                </span>
                                            ) : (
                                                <span className="text-text-secondary dark:text-zinc-500 text-sm">-</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-text-secondary dark:text-zinc-400">{cls.academic_year?.name || '-'}</td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => viewStudents(cls)}
                                                    className="w-8 h-8 rounded-lg bg-green-500/10 text-green-600 dark:text-green-400 hover:bg-green-500/20 flex items-center justify-center transition-colors"
                                                    title="Lihat Siswa"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                                    </svg>
                                                </button>
                                                <button
                                                    onClick={() => openEdit(cls)}
                                                    className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 flex items-center justify-center transition-colors"
                                                    title="Edit"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                    </svg>
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(cls.id)}
                                                    className="w-8 h-8 rounded-lg bg-red-500/10 text-red-600 hover:bg-red-500/20 flex items-center justify-center transition-colors"
                                                    title="Hapus"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
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

            {/* Add/Edit Class Modal */}
            <Modal
                open={showModal}
                onClose={() => setShowModal(false)}
                title={editingClass ? '✏️ Edit Kelas' : '➕ Tambah Kelas'}
            >
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-bold text-text-main dark:text-white mb-2">Nama Kelas</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-4 py-3 bg-secondary/5 border border-secondary/20 rounded-xl text-text-main dark:text-white focus:outline-none focus:ring-2 focus:ring-primary placeholder-text-secondary/50"
                            placeholder="Contoh: X IPA 1"
                            required
                        />
                    </div>
                    {/* School Level Dropdown */}
                    <div>
                        <label className="block text-sm font-bold text-text-main dark:text-white mb-2">Jenjang Sekolah</label>
                        <div className="relative">
                            <select
                                value={formData.school_level || ''}
                                onChange={(e) => setFormData({ ...formData, school_level: e.target.value as SchoolLevel || null })}
                                className="w-full px-4 py-3 bg-secondary/5 border border-secondary/20 rounded-xl text-text-main dark:text-white focus:outline-none focus:ring-2 focus:ring-primary appearance-none"
                            >
                                <option value="">Pilih Jenjang (optional)</option>
                                <option value="SMP">SMP (Sekolah Menengah Pertama - Kelas 7-9)</option>
                                <option value="SMA">SMA (Sekolah Menengah Atas - Kelas 10-12)</option>
                            </select>
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-text-secondary">
                                ▼
                            </div>
                        </div>
                        <p className="text-xs text-text-secondary dark:text-zinc-400 mt-2">Pilih jenjang terlebih dahulu untuk label tingkat yang sesuai</p>
                    </div>

                    {/* Grade Level Dropdown */}
                    <div>
                        <label className="block text-sm font-bold text-text-main dark:text-white mb-2">Tingkat Kelas</label>
                        <div className="relative">
                            <select
                                value={formData.grade_level || ''}
                                onChange={(e) => setFormData({ ...formData, grade_level: e.target.value ? parseInt(e.target.value) : null })}
                                className="w-full px-4 py-3 bg-secondary/5 border border-secondary/20 rounded-xl text-text-main dark:text-white focus:outline-none focus:ring-2 focus:ring-primary appearance-none"
                            >
                                <option value="">Pilih Tingkat (optional)</option>
                                <option value="1">
                                    {formData.school_level === 'SMP' ? 'MP1 (Kelas 7)' : formData.school_level === 'SMA' ? 'MA1 (Kelas 10)' : 'Tingkat 1'}
                                </option>
                                <option value="2">
                                    {formData.school_level === 'SMP' ? 'MP2 (Kelas 8)' : formData.school_level === 'SMA' ? 'MA2 (Kelas 11)' : 'Tingkat 2'}
                                </option>
                                <option value="3">
                                    {formData.school_level === 'SMP' ? 'MP3 (Kelas 9)' : formData.school_level === 'SMA' ? 'MA3 (Kelas 12)' : 'Tingkat 3'}
                                </option>
                            </select>
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-text-secondary">
                                ▼
                            </div>
                        </div>
                        <p className="text-xs text-text-secondary dark:text-zinc-400 mt-2">
                            {formData.school_level === 'SMP' ? 'MP = Menengah Pertama (Kelas 7, 8, 9)' : formData.school_level === 'SMA' ? 'MA = Menengah Atas (Kelas 10, 11, 12)' : 'Pilih jenjang untuk melihat label yang sesuai'}
                        </p>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-text-main dark:text-white mb-2">Tahun Ajaran</label>
                        <div className="relative">
                            <select
                                value={formData.academic_year_id}
                                onChange={(e) => setFormData({ ...formData, academic_year_id: e.target.value })}
                                className="w-full px-4 py-3 bg-secondary/5 border border-secondary/20 rounded-xl text-text-main dark:text-white focus:outline-none focus:ring-2 focus:ring-primary appearance-none"
                                required
                            >
                                <option value="">Pilih Tahun Ajaran</option>
                                {academicYears.map((year) => (
                                    <option key={year.id} value={year.id}>{year.name} {year.is_active && '(Aktif)'}</option>
                                ))}
                            </select>
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-text-secondary">
                                ▼
                            </div>
                        </div>
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

            {/* Students List Modal */}
            <Modal
                open={showStudentsModal}
                onClose={() => setShowStudentsModal(false)}
                title={`Students in ${selectedClass?.name || 'Class'}`}
                maxWidth="lg"
            >
                <div className="max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                    {loadingStudents ? (
                        <div className="py-12 flex justify-center">
                            <div className="animate-spin text-primary"><School className="w-6 h-6" /></div>
                        </div>
                    ) : students.length === 0 ? (
                        <EmptyState
                            icon={<School className="w-12 h-12 text-secondary" />}
                            title="Belum ada siswa"
                            description="Kelas ini belum memiliki siswa terdaftar."
                        />
                    ) : (
                        <div className="space-y-3">
                            <div className="flex justify-between items-center mb-4 sticky top-0 bg-white dark:bg-surface-dark pb-2 z-10 border-b border-secondary/10">
                                <h3 className="font-bold text-text-main dark:text-white">Daftar Siswa</h3>
                                <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-bold">{students.length} Siswa</span>
                            </div>

                            {students.map((student, idx) => (
                                <div key={student.id} className="flex items-center gap-4 p-4 bg-secondary/5 rounded-2xl hover:bg-secondary/10 transition-colors border border-transparent hover:border-secondary/20">
                                    <div className="w-10 h-10 rounded-full bg-white dark:bg-white/10 flex items-center justify-center font-bold text-primary shadow-sm">
                                        {idx + 1}
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-bold text-text-main dark:text-white">{student.user?.full_name || 'Tanpa Nama'}</p>
                                        <p className="text-sm text-text-secondary dark:text-[#A8BC9F]">NISN: {student.nisn}</p>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-xs text-text-secondary px-2 py-1 bg-white dark:bg-black/20 rounded-md">
                                            ID: {student.id.substring(0, 6)}...
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                <div className="pt-6 border-t border-secondary/10 mt-2">
                    <Button variant="secondary" onClick={() => setShowStudentsModal(false)} className="w-full">
                        Tutup
                    </Button>
                </div>
            </Modal>
        </div>
    )
}
