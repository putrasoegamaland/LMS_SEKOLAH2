'use client'

import { useEffect, useState } from 'react'
import { Modal, Button, PageHeader, EmptyState } from '@/components/ui'
import Card from '@/components/ui/Card'
import { User as Users, AddUser as UserPlus, Edit as Pencil, Delete as Trash2, Show as Eye, Hide as EyeOff, InfoCircle as AlertCircle, Filter, Document as GraduationCap, Paper } from 'react-iconly'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { Class, SchoolLevel } from '@/lib/types'

interface Student {
    id: string
    nis: string | null
    class_id: string | null
    gender: 'L' | 'P' | null
    angkatan: string | null
    entry_year: number | null
    school_level: SchoolLevel | null
    status: string
    user: {
        id: string
        username: string
        full_name: string | null
    }
    class: { id: string; name: string; grade_level?: number; school_level?: SchoolLevel } | null
}

interface FormData {
    username: string
    password: string
    full_name: string
    nis: string
    class_id: string
    gender: string
    angkatan: string
    entry_year: string
    school_level: string
}

const defaultFormData: FormData = {
    username: '',
    password: '',
    full_name: '',
    nis: '',
    class_id: '',
    gender: '',
    angkatan: '',
    entry_year: '',
    school_level: ''
}

// Generate angkatan options (last 10 years)
const currentYear = new Date().getFullYear()
const angkatanOptions = Array.from({ length: 10 }, (_, i) => (currentYear - i).toString())

export default function SiswaPage() {
    const [students, setStudents] = useState<Student[]>([])
    const [filteredStudents, setFilteredStudents] = useState<Student[]>([])
    const [classes, setClasses] = useState<Class[]>([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [editingStudent, setEditingStudent] = useState<Student | null>(null)
    const [formData, setFormData] = useState<FormData>(defaultFormData)
    const [showPassword, setShowPassword] = useState(false)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    // Filter states
    const [filterAngkatan, setFilterAngkatan] = useState('')
    const [filterSchoolLevel, setFilterSchoolLevel] = useState('')
    const [showFilters, setShowFilters] = useState(false)

    const fetchData = async () => {
        try {
            const [studentsRes, classesRes] = await Promise.all([
                fetch('/api/students'),
                fetch('/api/classes')
            ])
            const [studentsData, classesData] = await Promise.all([
                studentsRes.json(),
                classesRes.json()
            ])
            const studentList = Array.isArray(studentsData) ? studentsData : []
            setStudents(studentList)
            setFilteredStudents(studentList)
            setClasses(Array.isArray(classesData) ? classesData : [])
        } catch (error) {
            console.error('Error:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { fetchData() }, [])

    // Apply filters
    useEffect(() => {
        let filtered = students
        if (filterAngkatan) {
            filtered = filtered.filter(s => s.angkatan === filterAngkatan)
        }
        if (filterSchoolLevel) {
            filtered = filtered.filter(s => s.school_level === filterSchoolLevel)
        }
        setFilteredStudents(filtered)
    }, [students, filterAngkatan, filterSchoolLevel])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)
        setError('')
        try {
            const url = editingStudent ? `/api/students/${editingStudent.id}` : '/api/students'
            const method = editingStudent ? 'PUT' : 'POST'

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    class_id: formData.class_id || null,
                    entry_year: formData.entry_year ? parseInt(formData.entry_year) : null,
                    school_level: formData.school_level || null,
                    angkatan: formData.angkatan || null
                })
            })

            const data = await res.json()

            if (!res.ok) {
                setError(data.error || 'Gagal menyimpan')
                return
            }

            setShowModal(false)
            setEditingStudent(null)
            setFormData(defaultFormData)
            fetchData()
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Yakin ingin menghapus siswa ini?')) return
        await fetch(`/api/students/${id}`, { method: 'DELETE' })
        fetchData()
    }

    const openEdit = (student: Student) => {
        setEditingStudent(student)
        setFormData({
            username: student.user.username,
            password: '',
            full_name: student.user.full_name || '',
            nis: student.nis || '',
            class_id: student.class_id || '',
            gender: student.gender || '',
            angkatan: student.angkatan || '',
            entry_year: student.entry_year?.toString() || '',
            school_level: student.school_level || ''
        })
        setError('')
        setShowModal(true)
    }

    const openAdd = () => {
        setEditingStudent(null)
        setFormData(defaultFormData)
        setError('')
        setShowModal(true)
    }

    const clearFilters = () => {
        setFilterAngkatan('')
        setFilterSchoolLevel('')
    }

    // Get unique angkatan values from students
    const uniqueAngkatan = [...new Set(students.map(s => s.angkatan).filter(Boolean))].sort().reverse()

    return (
        <div className="space-y-6">
            <PageHeader
                title="Akun Siswa"
                subtitle="Kelola data siswa dan akses login"
                backHref="/dashboard/admin"
                icon={<div className="text-violet-500"><Users set="bold" primaryColor="currentColor" size={24} /></div>}
                action={
                    <div className="flex gap-2">
                        <Button variant="secondary" onClick={() => setShowFilters(!showFilters)} icon={<Filter set="bold" primaryColor="currentColor" size={20} />}>
                            Filter
                        </Button>
                        <Button onClick={openAdd} icon={<UserPlus set="bold" primaryColor="currentColor" size={20} />}>
                            Tambah Siswa
                        </Button>
                    </div>
                }
            />

            {/* Filters */}
            {showFilters && (
                <Card className="p-4">
                    <div className="flex flex-wrap items-center gap-4">
                        <div className="flex items-center gap-2">
                            <label className="text-sm font-medium text-text-main dark:text-white">Angkatan:</label>
                            <select
                                value={filterAngkatan}
                                onChange={(e) => setFilterAngkatan(e.target.value)}
                                className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            >
                                <option value="">Semua</option>
                                {uniqueAngkatan.map(a => (
                                    <option key={a} value={a!}>{a}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex items-center gap-2">
                            <label className="text-sm font-medium text-text-main dark:text-white">Level:</label>
                            <select
                                value={filterSchoolLevel}
                                onChange={(e) => setFilterSchoolLevel(e.target.value)}
                                className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            >
                                <option value="">Semua</option>
                                <option value="SMP">SMP</option>
                                <option value="SMA">SMA</option>
                            </select>
                        </div>
                        {(filterAngkatan || filterSchoolLevel) && (
                            <button
                                onClick={clearFilters}
                                className="text-sm text-primary hover:underline"
                            >
                                Reset Filter
                            </button>
                        )}
                        <div className="text-sm text-text-secondary ml-auto">
                            Menampilkan {filteredStudents.length} dari {students.length} siswa
                        </div>
                    </div>
                </Card>
            )}

            <Card className="overflow-hidden p-0">
                {loading ? (
                    <div className="p-12 flex justify-center">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                ) : filteredStudents.length === 0 ? (
                    <div className="p-6">
                        <EmptyState
                            icon={<div className="text-violet-200"><Users set="bold" primaryColor="currentColor" size={48} /></div>}
                            title="Belum Ada Siswa"
                            description={students.length > 0 ? "Tidak ada siswa yang sesuai filter" : "Tambahkan akun siswa untuk memulai"}
                            action={<Button onClick={students.length > 0 ? clearFilters : openAdd}>{students.length > 0 ? 'Reset Filter' : 'Tambah Siswa'}</Button>}
                        />
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                                <tr>
                                    <th className="px-6 py-4 text-left text-sm font-bold text-text-main dark:text-white uppercase tracking-wider">Nama</th>
                                    <th className="px-6 py-4 text-left text-sm font-bold text-text-main dark:text-white uppercase tracking-wider">L/P</th>
                                    <th className="px-6 py-4 text-left text-sm font-bold text-text-main dark:text-white uppercase tracking-wider">NIS</th>
                                    <th className="px-6 py-4 text-left text-sm font-bold text-text-main dark:text-white uppercase tracking-wider">Angkatan</th>
                                    <th className="px-6 py-4 text-left text-sm font-bold text-text-main dark:text-white uppercase tracking-wider">Kelas</th>
                                    <th className="px-6 py-4 text-left text-sm font-bold text-text-main dark:text-white uppercase tracking-wider">Username</th>
                                    <th className="px-6 py-4 text-right text-sm font-bold text-text-main dark:text-white uppercase tracking-wider">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-secondary/20 dark:divide-white/5">
                                {filteredStudents.map((student) => (
                                    <tr key={student.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-sky-500 to-blue-500 flex items-center justify-center text-white font-bold shadow-sm text-sm">
                                                    {student.user.full_name?.[0] || '?'}
                                                </div>
                                                <span className="text-slate-900 dark:text-white font-bold">{student.user.full_name || '-'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {student.gender ? (
                                                <span className={`px-2.5 py-1 text-xs font-bold rounded-full border ${student.gender === 'L'
                                                    ? 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20'
                                                    : 'bg-pink-50 text-pink-600 border-pink-200 dark:bg-pink-500/10 dark:text-pink-400 dark:border-pink-500/20'
                                                    }`}>
                                                    {student.gender === 'L' ? 'L' : 'P'}
                                                </span>
                                            ) : (
                                                <span className="text-text-secondary dark:text-zinc-500">-</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-text-secondary dark:text-zinc-300 font-mono text-sm">{student.nis || '-'}</td>
                                        <td className="px-6 py-4">
                                            {student.angkatan ? (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-600 border border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20 rounded-full text-xs font-bold">
                                                    <GraduationCap set="bold" primaryColor="currentColor" size={12} />
                                                    {student.angkatan}
                                                </span>
                                            ) : (
                                                <span className="text-text-secondary dark:text-zinc-500">-</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            {student.class ? (
                                                <span className="px-3 py-1 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 rounded-full text-xs font-bold border border-emerald-100 dark:border-emerald-800">
                                                    {student.class.name}
                                                </span>
                                            ) : (
                                                <span className="text-text-secondary dark:text-zinc-500 text-xs italic">Belum masuk kelas</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-text-secondary dark:text-zinc-300 font-mono text-sm">{student.user.username}</td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Link href={`/dashboard/admin/siswa/${student.id}/rapor`} className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 flex items-center justify-center transition-colors" title="Cetak Rapor">
                                                    <Paper set="bold" primaryColor="currentColor" size={16} />
                                                </Link>
                                                <button onClick={() => openEdit(student)} className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 flex items-center justify-center transition-colors">
                                                    <Pencil set="bold" primaryColor="currentColor" size={16} />
                                                </button>
                                                <button onClick={() => handleDelete(student.id)} className="w-8 h-8 rounded-lg bg-red-500/10 text-red-600 hover:bg-red-500/20 flex items-center justify-center transition-colors">
                                                    <Trash2 set="bold" primaryColor="currentColor" size={16} />
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

            <Modal
                open={showModal}
                onClose={() => setShowModal(false)}
                title={editingStudent ? 'Edit Siswa' : 'Tambah Siswa'}
            >
                {error && (
                    <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-600 text-sm font-medium flex items-center gap-2">
                        <AlertCircle set="bold" primaryColor="currentColor" size={20} />
                        {error}
                    </div>
                )}
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-text-main dark:text-white mb-2">Nama Lengkap</label>
                        <input
                            type="text"
                            value={formData.full_name}
                            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder-slate-400"
                            placeholder="Nama Lengkap Siswa"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-text-main dark:text-white mb-2">NIS</label>
                            <input
                                type="text"
                                value={formData.nis}
                                onChange={(e) => setFormData({ ...formData, nis: e.target.value })}
                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder-slate-400"
                                placeholder="NIS Siswa"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-text-main dark:text-white mb-2">Jenis Kelamin</label>
                            <div className="relative">
                                <select
                                    value={formData.gender}
                                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 appearance-none"
                                >
                                    <option value="">Pilih</option>
                                    <option value="L">Laki-laki</option>
                                    <option value="P">Perempuan</option>
                                </select>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-text-secondary">▼</div>
                            </div>
                        </div>
                    </div>

                    {/* Angkatan Section */}
                    <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="text-amber-600"><GraduationCap set="bold" primaryColor="currentColor" size={20} /></div>
                            <span className="text-sm font-bold text-amber-800 dark:text-amber-200">Informasi Angkatan</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-text-main dark:text-white mb-2">Angkatan</label>
                                <div className="relative">
                                    <select
                                        value={formData.angkatan}
                                        onChange={(e) => setFormData({ ...formData, angkatan: e.target.value, entry_year: e.target.value })}
                                        className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 appearance-none"
                                    >
                                        <option value="">Pilih Angkatan</option>
                                        {angkatanOptions.map(year => (
                                            <option key={year} value={year}>{year}</option>
                                        ))}
                                    </select>
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-text-secondary">▼</div>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-text-main dark:text-white mb-2">Level Sekolah</label>
                                <div className="relative">
                                    <select
                                        value={formData.school_level}
                                        onChange={(e) => setFormData({ ...formData, school_level: e.target.value })}
                                        className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 appearance-none"
                                    >
                                        <option value="">Pilih Level</option>
                                        <option value="SMP">SMP</option>
                                        <option value="SMA">SMA</option>
                                    </select>
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-text-secondary">▼</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-text-main dark:text-white mb-2">Kelas</label>
                        <div className="relative">
                            <select
                                value={formData.class_id}
                                onChange={(e) => setFormData({ ...formData, class_id: e.target.value })}
                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 appearance-none"
                            >
                                <option value="">Pilih Kelas</option>
                                {classes
                                    .filter(c => !formData.school_level || c.school_level === formData.school_level)
                                    .map((c) => (
                                        <option key={c.id} value={c.id}>{c.name} {c.school_level ? `(${c.school_level})` : ''}</option>
                                    ))}
                            </select>
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-text-secondary">▼</div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-text-main dark:text-white mb-2">Username</label>
                        <input
                            type="text"
                            value={formData.username}
                            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder-slate-400"
                            placeholder="Username login"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-text-main dark:text-white mb-2">
                            Password {editingStudent && <span className="text-text-secondary font-normal text-xs">(Biarkan kosong jika tidak ingin mengubah)</span>}
                        </label>
                        <div className="relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder-slate-400 pr-12"
                                placeholder={editingStudent ? "••••••••" : "Password"}
                                required={!editingStudent}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-text-secondary hover:text-text-main transition-colors"
                            >
                                {showPassword ? (
                                    <EyeOff set="bold" primaryColor="currentColor" size={20} />
                                ) : (
                                    <Eye set="bold" primaryColor="currentColor" size={20} />
                                )}
                            </button>
                        </div>
                    </div>
                    <div className="flex gap-3 pt-4 border-t border-secondary/10 mt-4">
                        <Button type="button" variant="secondary" onClick={() => setShowModal(false)} className="flex-1">
                            Batal
                        </Button>
                        <Button type="submit" loading={saving} className="flex-1">
                            Simpan Data
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    )
}
