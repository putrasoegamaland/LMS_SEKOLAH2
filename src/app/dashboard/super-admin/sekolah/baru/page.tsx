'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

export default function TambahSekolahPage() {
    const router = useRouter()
    const { user } = useAuth()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [form, setForm] = useState({
        name: '',
        code: '',
        address: '',
        phone: '',
        email: '',
        school_level: 'BOTH' as string,
        max_students: 500,
        max_teachers: 50,
    })

    if (user?.role !== 'SUPER_ADMIN') {
        return <div className="p-8 text-center text-text-secondary">Akses ditolak</div>
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            const res = await fetch('/api/schools', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form)
            })

            const data = await res.json()

            if (!res.ok) {
                setError(data.error || 'Gagal membuat sekolah')
                setLoading(false)
                return
            }

            // Redirect to school detail to create admin
            router.push(`/dashboard/super-admin/sekolah/${data.id}`)
        } catch {
            setError('Terjadi kesalahan server')
        }

        setLoading(false)
    }

    const updateForm = (field: string, value: string | number) => {
        setForm(prev => ({ ...prev, [field]: value }))
    }

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <button
                    onClick={() => router.back()}
                    className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-text-main dark:text-white">Tambah Sekolah Baru</h1>
                    <p className="text-sm text-text-secondary">Isi informasi sekolah, lalu buat akun admin</p>
                </div>
            </div>

            {/* Error */}
            {error && (
                <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 text-sm font-medium">
                    {error}
                </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="bg-white dark:bg-surface-dark rounded-2xl border border-[#E8F0E6] dark:border-primary/10 p-6 space-y-5">
                {/* Nama */}
                <div>
                    <label className="block text-sm font-bold text-text-main dark:text-white mb-2">Nama Sekolah *</label>
                    <input
                        type="text"
                        value={form.name}
                        onChange={e => updateForm('name', e.target.value)}
                        placeholder="Contoh: SMK Nusantara"
                        required
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-text-main dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    />
                </div>

                {/* Kode */}
                <div>
                    <label className="block text-sm font-bold text-text-main dark:text-white mb-2">Kode Sekolah *</label>
                    <input
                        type="text"
                        value={form.code}
                        onChange={e => updateForm('code', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                        placeholder="Contoh: smk-nusantara"
                        required
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-text-main dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-mono"
                    />
                    <p className="text-xs text-text-secondary mt-1">Huruf kecil, angka, dan tanda (-) saja</p>
                </div>

                {/* 2 columns */}
                <div className="grid grid-cols-2 gap-4">
                    {/* Level */}
                    <div>
                        <label className="block text-sm font-bold text-text-main dark:text-white mb-2">Jenjang</label>
                        <select
                            value={form.school_level}
                            onChange={e => updateForm('school_level', e.target.value)}
                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-text-main dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                        >
                            <option value="SMP">SMP</option>
                            <option value="SMA">SMA/SMK</option>
                            <option value="BOTH">SMP + SMA</option>
                        </select>
                    </div>

                    {/* Phone */}
                    <div>
                        <label className="block text-sm font-bold text-text-main dark:text-white mb-2">Telepon</label>
                        <input
                            type="text"
                            value={form.phone}
                            onChange={e => updateForm('phone', e.target.value)}
                            placeholder="08xx-xxxx-xxxx"
                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-text-main dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                        />
                    </div>
                </div>

                {/* Email */}
                <div>
                    <label className="block text-sm font-bold text-text-main dark:text-white mb-2">Email</label>
                    <input
                        type="email"
                        value={form.email}
                        onChange={e => updateForm('email', e.target.value)}
                        placeholder="admin@sekolah.sch.id"
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-text-main dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    />
                </div>

                {/* Alamat */}
                <div>
                    <label className="block text-sm font-bold text-text-main dark:text-white mb-2">Alamat</label>
                    <textarea
                        value={form.address}
                        onChange={e => updateForm('address', e.target.value)}
                        placeholder="Jl. Pendidikan No. 1, Kota..."
                        rows={2}
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-text-main dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none"
                    />
                </div>

                {/* Kuota */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-bold text-text-main dark:text-white mb-2">Maks Siswa</label>
                        <input
                            type="number"
                            value={form.max_students}
                            onChange={e => updateForm('max_students', parseInt(e.target.value) || 0)}
                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-text-main dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-text-main dark:text-white mb-2">Maks Guru</label>
                        <input
                            type="number"
                            value={form.max_teachers}
                            onChange={e => updateForm('max_teachers', parseInt(e.target.value) || 0)}
                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-text-main dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                        />
                    </div>
                </div>

                {/* Submit */}
                <button
                    type="submit"
                    disabled={loading || !form.name || !form.code}
                    className="w-full py-3 px-6 bg-primary hover:bg-primary-dark text-white font-bold rounded-xl shadow-lg shadow-primary/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    {loading ? (
                        <>
                            <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Menyimpan...
                        </>
                    ) : (
                        <>🏫 Buat Sekolah &amp; Lanjut Buat Admin</>
                    )}
                </button>
            </form>
        </div>
    )
}
