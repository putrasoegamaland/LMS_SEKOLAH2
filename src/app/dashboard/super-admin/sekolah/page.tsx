'use client'

import { useState, useEffect } from 'react'
import { Trash } from 'lucide-react'

interface School {
    id: string
    name: string
    code: string
    logo_url: string | null
    address: string | null
    phone: string | null
    email: string | null
    school_level: string | null
    is_active: boolean
    max_students: number
    max_teachers: number
    created_at: string
    student_count: number
    teacher_count: number
    class_count: number
}

export default function SekolahListPage() {
    const [schools, setSchools] = useState<School[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')

    // Delete Modal State
    const [deleteTarget, setDeleteTarget] = useState<School | null>(null)
    const [deleteStep, setDeleteStep] = useState<1 | 2>(1)
    const [confirmInput, setConfirmInput] = useState('')
    const [deleting, setDeleting] = useState(false)

    useEffect(() => {
        fetchSchools()
    }, [])

    const fetchSchools = async () => {
        try {
            const res = await fetch('/api/schools')
            if (res.ok) {
                const data = await res.json()
                setSchools(data)
            }
        } catch (err) {
            console.error('Failed to fetch schools:', err)
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async () => {
        if (!deleteTarget) return
        setDeleting(true)
        try {
            const res = await fetch(`/api/schools/${deleteTarget.id}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ confirm_name: confirmInput })
            })

            if (res.ok) {
                // Refresh list
                fetchSchools()
                // Reset modal
                setDeleteTarget(null)
                setDeleteStep(1)
                setConfirmInput('')
            } else {
                const data = await res.json()
                alert(`Gagal: ${data.error}`)
            }
        } catch (err) {
            console.error('Error deleting school:', err)
            alert('Terjadi kesalahan saat menghapus sekolah.')
        } finally {
            setDeleting(false)
        }
    }

    const filteredSchools = schools.filter(s =>
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.code.toLowerCase().includes(search.toLowerCase())
    )

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-text-main dark:text-white">Manajemen Sekolah</h1>
                    <p className="text-text-secondary text-sm mt-1">Kelola semua sekolah yang terdaftar</p>
                </div>
                <a
                    href="/dashboard/super-admin/sekolah/baru"
                    className="px-5 py-2.5 bg-primary hover:bg-primary-dark text-white font-bold text-sm rounded-xl shadow-lg shadow-primary/20 transition-all flex items-center gap-2"
                >
                    <span className="text-lg">+</span> Tambah Sekolah
                </a>
            </div>

            {/* Search */}
            <div className="relative">
                <svg className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                    type="text"
                    placeholder="Cari sekolah..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-white dark:bg-surface-dark border border-[#E8F0E6] dark:border-primary/10 rounded-xl text-text-main dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
            </div>

            {/* School Cards */}
            {loading ? (
                <div className="flex items-center justify-center py-16">
                    <svg className="animate-spin w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                </div>
            ) : filteredSchools.length === 0 ? (
                <div className="text-center py-16 text-text-secondary">
                    {search ? 'Tidak ada sekolah yang cocok' : 'Belum ada sekolah terdaftar'}
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2">
                    {filteredSchools.map((school) => (
                        <a key={school.id} href={`/dashboard/super-admin/sekolah/${school.id}`} className="bg-white dark:bg-surface-dark rounded-2xl border border-[#E8F0E6] dark:border-primary/10 p-6 hover:shadow-lg transition-shadow cursor-pointer block">
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-xl">
                                        🏫
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-text-main dark:text-white text-lg">{school.name}</h3>
                                        <p className="text-xs text-text-secondary">{school.code} • {school.school_level || '-'}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${school.is_active
                                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                        : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                        }`}>
                                        {school.is_active ? 'Aktif' : 'Nonaktif'}
                                    </span>
                                    <button
                                        onClick={(e) => {
                                            e.preventDefault()
                                            e.stopPropagation()
                                            setDeleteTarget(school)
                                            setDeleteStep(1)
                                            setConfirmInput('')
                                        }}
                                        className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl transition-colors"
                                        title="Hapus Sekolah"
                                    >
                                        <Trash className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-3 mb-4">
                                <div className="bg-slate-50 dark:bg-white/5 rounded-xl p-3 text-center">
                                    <p className="text-lg font-bold text-text-main dark:text-white">{school.student_count || 0}</p>
                                    <p className="text-xs text-text-secondary">Siswa</p>
                                </div>
                                <div className="bg-slate-50 dark:bg-white/5 rounded-xl p-3 text-center">
                                    <p className="text-lg font-bold text-text-main dark:text-white">{school.teacher_count || 0}</p>
                                    <p className="text-xs text-text-secondary">Guru</p>
                                </div>
                                <div className="bg-slate-50 dark:bg-white/5 rounded-xl p-3 text-center">
                                    <p className="text-lg font-bold text-text-main dark:text-white">{school.class_count || 0}</p>
                                    <p className="text-xs text-text-secondary">Kelas</p>
                                </div>
                            </div>

                            {school.address && (
                                <p className="text-xs text-text-secondary truncate mb-2">📍 {school.address}</p>
                            )}
                            {school.email && (
                                <p className="text-xs text-text-secondary truncate">📧 {school.email}</p>
                            )}
                        </a>
                    ))}
                </div>
            )}

            {/* Strict Confirmation Delete Modal */}
            {deleteTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-surface-dark border border-[#E8F0E6] dark:border-primary/10 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6">
                            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4 mx-auto">
                                <Trash className="w-6 h-6 text-red-600 dark:text-red-400" />
                            </div>

                            <h3 className="text-xl font-bold text-center text-text-main dark:text-white mb-2">
                                Hapus {deleteTarget.name}?
                            </h3>

                            {deleteStep === 1 ? (
                                <div className="space-y-4">
                                    <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 rounded-xl p-4">
                                        <p className="text-sm font-bold text-red-800 dark:text-red-400 mb-2">⚠️ Peringatan Risiko Fatal</p>
                                        <p className="text-xs text-red-700 dark:text-red-300">
                                            Anda akan menghapus secara permanen:
                                        </p>
                                        <ul className="text-xs text-red-700 dark:text-red-300 list-disc list-inside mt-2 space-y-1 font-bold">
                                            <li>{deleteTarget.student_count} Siswa & Akun</li>
                                            <li>{deleteTarget.teacher_count} Guru & Akun</li>
                                            <li>{deleteTarget.class_count} Kelas & Jadwal</li>
                                            <li>Semua Mata Pelajaran, Tugas, & Ujian</li>
                                            <li>Semua Riwayat Nilai & Submission</li>
                                        </ul>
                                    </div>
                                    <p className="text-sm text-center font-bold text-text-secondary">
                                        Tindakan ini TIDAK BISA dibatalkan.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <p className="text-sm text-text-secondary text-center">
                                        Untuk mengonfirmasi penghapusan, ketik nama sekolah dengan benar:
                                    </p>
                                    <div className="bg-slate-100 dark:bg-white/5 p-3 rounded-lg text-center select-none">
                                        <span className="font-mono font-bold text-lg text-text-main dark:text-white select-all">
                                            {deleteTarget.name}
                                        </span>
                                    </div>
                                    <input
                                        type="text"
                                        value={confirmInput}
                                        onChange={(e) => setConfirmInput(e.target.value)}
                                        placeholder="Ketik persis seperti di atas..."
                                        className="w-full px-4 py-3 bg-white dark:bg-surface-dark border-2 border-red-200 dark:border-red-900/40 rounded-xl text-text-main dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 font-mono transition-all text-center"
                                        autoComplete="off"
                                        autoCorrect="off"
                                    />
                                </div>
                            )}
                        </div>

                        <div className="p-4 bg-slate-50 dark:bg-white/5 border-t border-[#E8F0E6] dark:border-primary/10 flex gap-3">
                            <button
                                onClick={() => {
                                    setDeleteTarget(null)
                                    setDeleteStep(1)
                                    setConfirmInput('')
                                }}
                                disabled={deleting}
                                className="flex-1 py-2.5 rounded-xl font-bold bg-white dark:bg-surface-dark border border-slate-200 dark:border-slate-700 text-text-main dark:text-white hover:bg-slate-50 dark:hover:bg-white/5 transition-colors disabled:opacity-50"
                            >
                                Batal
                            </button>
                            
                            {deleteStep === 1 ? (
                                <button
                                    onClick={() => setDeleteStep(2)}
                                    className="flex-1 py-2.5 rounded-xl font-bold bg-red-600 text-white hover:bg-red-700 transition-colors"
                                >
                                    Lanjut Hapus
                                </button>
                            ) : (
                                <button
                                    onClick={handleDelete}
                                    disabled={confirmInput !== deleteTarget.name || deleting}
                                    className="flex-1 py-2.5 rounded-xl font-bold bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {deleting ? (
                                        <>
                                            <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Menghapus...
                                        </>
                                    ) : (
                                        'Hapus Permanen'
                                    )}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
