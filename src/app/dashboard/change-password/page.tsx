'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Lock, CheckCircle2, AlertCircle, Eye, EyeOff } from 'lucide-react'

export default function ChangePasswordPage() {
    const router = useRouter()
    const { user, refreshUser } = useAuth()

    const [currentPassword, setCurrentPassword] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [showPassword, setShowPassword] = useState({ current: false, new: false, confirm: false })

    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState(false)

    // Only students and walis (or anyone forced) should be here. If not forced, they can just proceed to dashboard.
    // The layout already handles forcing them here, but we can add a skip button if they somehow got here without being forced
    // (though the layout won't show the sidebar, so they'd be stuck).
    // Actually, Phase 3 spec says "Siswa/Wali yang must_change_password = true dipaksa masuk...". 

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')

        if (newPassword.length < 6) {
            setError('Password baru minimal 6 karakter')
            return
        }

        if (newPassword !== confirmPassword) {
            setError('Konfirmasi password tidak cocok')
            return
        }

        if (currentPassword === newPassword) {
            setError('Password baru tidak boleh sama dengan password lama')
            return
        }

        setLoading(true)
        try {
            const res = await fetch('/api/auth/change-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ current_password: currentPassword, new_password: newPassword })
            })

            const data = await res.json()

            if (!res.ok) {
                setError(data.error || 'Gagal mengubah password')
                setLoading(false)
                return
            }

            setSuccess(true)

            // Refresh user state to clear the must_change_password flag
            await refreshUser()

            // Wait 2 seconds then redirect to dashboard
            setTimeout(() => {
                router.replace('/dashboard')
            }, 2000)

        } catch (err) {
            setError('Terjadi kesalahan jaringan')
            setLoading(false)
        }
    }

    if (success) {
        return (
            <div className="flex flex-col flex-1 items-center justify-center min-h-[70vh]">
                <div className="w-full max-w-md p-8 bg-white dark:bg-surface-dark border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl text-center">
                    <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle2 size={32} />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Password Diperbarui!</h2>
                    <p className="text-slate-600 dark:text-slate-400 mb-6">
                        Password Anda telah berhasil diubah. Anda akan dialihkan ke dashboard dalam beberapa detik.
                    </p>
                    <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                </div>
            </div>
        )
    }

    return (
        <div className="flex flex-col flex-1 items-center justify-center min-h-[70vh]">
            <div className="w-full max-w-md p-8 bg-white dark:bg-surface-dark border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Lock size={32} />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Wajib Ganti Password</h2>
                    <p className="text-slate-600 dark:text-slate-400 text-sm">
                        Demi keamanan akun Anda, silakan ubah password bawaan dari sekolah sebelum melanjutkan.
                    </p>
                </div>

                {error && (
                    <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/30 text-sm flex gap-3">
                        <AlertCircle className="w-5 h-5 flex-shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Current Password */}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5 ml-1">
                            Password Lama
                        </label>
                        <div className="relative">
                            <input
                                type={showPassword.current ? "text" : "password"}
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm"
                                placeholder="Masukkan password saat ini"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword({ ...showPassword, current: !showPassword.current })}
                                className="absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400 hover:text-emerald-500"
                            >
                                {showPassword.current ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    {/* New Password */}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5 ml-1">
                            Password Baru
                        </label>
                        <div className="relative">
                            <input
                                type={showPassword.new ? "text" : "password"}
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                minLength={6}
                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm"
                                placeholder="Minimal 6 karakter"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword({ ...showPassword, new: !showPassword.new })}
                                className="absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400 hover:text-emerald-500"
                            >
                                {showPassword.new ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    {/* Confirm Password */}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5 ml-1">
                            Konfirmasi Password Baru
                        </label>
                        <div className="relative">
                            <input
                                type={showPassword.confirm ? "text" : "password"}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                minLength={6}
                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm"
                                placeholder="Ketik ulang password baru"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword({ ...showPassword, confirm: !showPassword.confirm })}
                                className="absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400 hover:text-emerald-500"
                            >
                                {showPassword.confirm ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3.5 px-6 mt-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm rounded-xl shadow-lg shadow-emerald-500/30 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Menyimpan...' : 'Simpan Password Baru'}
                    </button>
                </form>

                {/* Optional escape hatch for admins/teachers who got here by mistake? 
                    According to spec, ANY role with must_change_password=true must change it. 
                    So no escape mechanism provided. */}
            </div>
        </div>
    )
}
