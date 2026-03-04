'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'

interface SchoolDetail {
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
    settings: Record<string, unknown>
    student_count: number
    teacher_count: number
    class_count: number
}

interface AdminUser {
    id: string
    username: string
    full_name: string
    created_at: string
}

export default function SekolahDetailPage() {
    const params = useParams()
    const router = useRouter()
    const schoolId = params.id as string
    const [school, setSchool] = useState<SchoolDetail | null>(null)
    const [loading, setLoading] = useState(true)

    // Admin management state
    const [admins, setAdmins] = useState<AdminUser[]>([])
    const [adminsLoading, setAdminsLoading] = useState(true)
    const [showAdminForm, setShowAdminForm] = useState(false)
    const [adminForm, setAdminForm] = useState({ username: '', password: '', full_name: '' })
    const [adminError, setAdminError] = useState('')
    const [adminSaving, setAdminSaving] = useState(false)

    // Reset password state
    const [resetTarget, setResetTarget] = useState<AdminUser | null>(null)
    const [newPassword, setNewPassword] = useState('')
    const [resetSaving, setResetSaving] = useState(false)

    useEffect(() => {
        const fetchSchool = async () => {
            try {
                const res = await fetch(`/api/schools/${schoolId}`)
                if (res.ok) {
                    const data = await res.json()
                    setSchool(data)
                } else {
                    router.push('/dashboard/super-admin/sekolah')
                }
            } catch (err) {
                console.error('Failed to fetch school:', err)
            } finally {
                setLoading(false)
            }
        }
        fetchSchool()
    }, [schoolId, router])

    useEffect(() => {
        const fetchAdmins = async () => {
            try {
                const res = await fetch(`/api/schools/${schoolId}/admin`)
                if (res.ok) {
                    const data = await res.json()
                    setAdmins(data)
                }
            } catch (err) {
                console.error('Failed to fetch admins:', err)
            } finally {
                setAdminsLoading(false)
            }
        }
        fetchAdmins()
    }, [schoolId])

    const handleCreateAdmin = async (e: React.FormEvent) => {
        e.preventDefault()
        setAdminError('')
        setAdminSaving(true)

        try {
            const res = await fetch(`/api/schools/${schoolId}/admin`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(adminForm)
            })
            const data = await res.json()

            if (!res.ok) {
                setAdminError(data.error || 'Gagal membuat admin')
            } else {
                setAdmins(prev => [data, ...prev])
                setAdminForm({ username: '', password: '', full_name: '' })
                setShowAdminForm(false)
            }
        } catch {
            setAdminError('Terjadi kesalahan server')
        }

        setAdminSaving(false)
    }

    const handleResetPassword = async () => {
        if (!resetTarget || !newPassword) return
        setResetSaving(true)

        try {
            const res = await fetch(`/api/schools/${schoolId}/admin`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: resetTarget.id, new_password: newPassword })
            })

            if (res.ok) {
                setResetTarget(null)
                setNewPassword('')
            }
        } catch (err) {
            console.error('Failed to reset password:', err)
        }

        setResetSaving(false)
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <svg className="animate-spin w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
            </div>
        )
    }

    if (!school) {
        return (
            <div className="text-center py-20 text-text-secondary">
                Sekolah tidak ditemukan
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Back + Header */}
            <div className="flex items-center gap-4">
                <button
                    onClick={() => router.back()}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition-colors"
                >
                    <svg className="w-5 h-5 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                </button>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold text-text-main dark:text-white">{school.name}</h1>
                    <p className="text-text-secondary text-sm">{school.code} • {school.school_level || '-'}</p>
                </div>
                <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${school.is_active
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                        : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        }`}>
                        {school.is_active ? 'Aktif' : 'Nonaktif'}
                    </span>
                    <a
                        href={`/dashboard/super-admin/sekolah/${schoolId}/edit`}
                        className="px-4 py-1.5 text-sm font-bold text-primary bg-primary/10 hover:bg-primary/20 rounded-xl transition-colors"
                    >
                        ✏️ Edit
                    </a>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
                <StatCard label="Siswa" value={school.student_count} max={school.max_students} icon="👨‍🎓" />
                <StatCard label="Guru" value={school.teacher_count} max={school.max_teachers} icon="👩‍🏫" />
                <StatCard label="Kelas" value={school.class_count} icon="📚" />
            </div>

            {/* Admin Management */}
            <div className="bg-white dark:bg-surface-dark rounded-2xl border border-[#E8F0E6] dark:border-primary/10 overflow-hidden">
                <div className="px-6 py-4 border-b border-[#E8F0E6] dark:border-primary/10 flex items-center justify-between">
                    <h2 className="text-lg font-bold text-text-main dark:text-white">👤 Admin Sekolah</h2>
                    <button
                        onClick={() => setShowAdminForm(!showAdminForm)}
                        className="px-4 py-2 bg-primary hover:bg-primary-dark text-white text-sm font-bold rounded-xl transition-colors"
                    >
                        {showAdminForm ? 'Batal' : '+ Tambah Admin'}
                    </button>
                </div>

                {/* Create Admin Form */}
                {showAdminForm && (
                    <div className="px-6 py-4 bg-emerald-50/50 dark:bg-emerald-900/10 border-b border-[#E8F0E6] dark:border-primary/10">
                        <form onSubmit={handleCreateAdmin} className="space-y-3">
                            {adminError && (
                                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm font-medium">
                                    {adminError}
                                </div>
                            )}
                            <div className="grid grid-cols-3 gap-3">
                                <input
                                    type="text"
                                    value={adminForm.full_name}
                                    onChange={e => setAdminForm(p => ({ ...p, full_name: e.target.value }))}
                                    placeholder="Nama Lengkap"
                                    required
                                    className="px-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-text-main dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                                />
                                <input
                                    type="text"
                                    value={adminForm.username}
                                    onChange={e => setAdminForm(p => ({ ...p, username: e.target.value }))}
                                    placeholder="Username"
                                    required
                                    className="px-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-text-main dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                                />
                                <input
                                    type="text"
                                    value={adminForm.password}
                                    onChange={e => setAdminForm(p => ({ ...p, password: e.target.value }))}
                                    placeholder="Password"
                                    required
                                    className="px-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-text-main dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={adminSaving}
                                className="px-6 py-2.5 bg-primary hover:bg-primary-dark text-white text-sm font-bold rounded-xl transition-colors disabled:opacity-50"
                            >
                                {adminSaving ? 'Menyimpan...' : 'Buat Akun Admin'}
                            </button>
                        </form>
                    </div>
                )}

                {/* Admin List */}
                {adminsLoading ? (
                    <div className="flex items-center justify-center py-8">
                        <svg className="animate-spin w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    </div>
                ) : admins.length === 0 ? (
                    <div className="text-center py-8 text-text-secondary">
                        <p className="text-2xl mb-2">⚠️</p>
                        <p className="font-medium">Belum ada admin untuk sekolah ini</p>
                        <p className="text-sm mt-1">Klik &quot;Tambah Admin&quot; untuk membuat akun admin</p>
                    </div>
                ) : (
                    <div className="divide-y divide-[#E8F0E6] dark:divide-primary/10">
                        {admins.map(admin => (
                            <div key={admin.id} className="px-6 py-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center text-lg">
                                        👤
                                    </div>
                                    <div>
                                        <p className="font-bold text-text-main dark:text-white">{admin.full_name}</p>
                                        <p className="text-xs text-text-secondary font-mono">@{admin.username}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-xs text-text-secondary">
                                        {new Date(admin.created_at).toLocaleDateString('id-ID')}
                                    </span>
                                    <button
                                        onClick={() => { setResetTarget(admin); setNewPassword('') }}
                                        className="px-3 py-1.5 text-xs font-bold text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
                                    >
                                        Reset Password
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Reset Password Modal */}
            {resetTarget && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-surface-dark rounded-2xl p-6 w-full max-w-md space-y-4">
                        <h3 className="text-lg font-bold text-text-main dark:text-white">
                            Reset Password — {resetTarget.full_name}
                        </h3>
                        <p className="text-sm text-text-secondary">Username: @{resetTarget.username}</p>
                        <input
                            type="text"
                            value={newPassword}
                            onChange={e => setNewPassword(e.target.value)}
                            placeholder="Password baru"
                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-text-main dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => setResetTarget(null)}
                                className="px-4 py-2 text-sm font-medium text-text-secondary hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition-colors"
                            >
                                Batal
                            </button>
                            <button
                                onClick={handleResetPassword}
                                disabled={!newPassword || resetSaving}
                                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold rounded-xl transition-colors disabled:opacity-50"
                            >
                                {resetSaving ? 'Menyimpan...' : 'Reset Password'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Info Card */}
            <div className="bg-white dark:bg-surface-dark rounded-2xl border border-[#E8F0E6] dark:border-primary/10 p-6 space-y-4">
                <h2 className="text-lg font-bold text-text-main dark:text-white">Informasi Sekolah</h2>

                <div className="grid gap-4 md:grid-cols-2">
                    <InfoRow label="Alamat" value={school.address} icon="📍" />
                    <InfoRow label="Email" value={school.email} icon="📧" />
                    <InfoRow label="Telepon" value={school.phone} icon="📞" />
                    <InfoRow label="Jenjang" value={school.school_level} icon="🏫" />
                    <InfoRow label="Maks. Siswa" value={school.max_students?.toString()} icon="👥" />
                    <InfoRow label="Maks. Guru" value={school.max_teachers?.toString()} icon="👤" />
                    <InfoRow label="Terdaftar" value={new Date(school.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })} icon="📅" />
                </div>
            </div>
        </div>
    )
}

function StatCard({ label, value, max, icon }: { label: string; value: number; max?: number; icon: string }) {
    const percentage = max ? Math.min((value / max) * 100, 100) : null

    return (
        <div className="bg-white dark:bg-surface-dark rounded-2xl border border-[#E8F0E6] dark:border-primary/10 p-5">
            <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">{icon}</span>
                <span className="text-sm text-text-secondary font-medium">{label}</span>
            </div>
            <p className="text-2xl font-bold text-text-main dark:text-white">
                {value.toLocaleString()}
                {max && <span className="text-sm font-normal text-text-secondary"> / {max.toLocaleString()}</span>}
            </p>
            {percentage !== null && (
                <div className="mt-2 h-1.5 bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden">
                    <div
                        className={`h-full rounded-full transition-all ${percentage > 90 ? 'bg-red-500' : percentage > 70 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                        style={{ width: `${percentage}%` }}
                    />
                </div>
            )}
        </div>
    )
}

function InfoRow({ label, value, icon }: { label: string; value: string | null | undefined; icon: string }) {
    return (
        <div className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-white/5 rounded-xl">
            <span className="text-base mt-0.5">{icon}</span>
            <div>
                <p className="text-xs text-text-secondary font-medium">{label}</p>
                <p className="text-sm text-text-main dark:text-white font-medium">{value || '-'}</p>
            </div>
        </div>
    )
}
