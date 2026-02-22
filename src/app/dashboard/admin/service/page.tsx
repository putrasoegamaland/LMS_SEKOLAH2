'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import Card from '@/components/ui/Card'
import { Loader2, Shield, CheckCircle2, AlertTriangle, XCircle, Info, RefreshCw, Wrench, Users, BookOpen, ClipboardCheck, Server, Clock, Database } from 'lucide-react'

interface DiagnosticCheck {
    id: string
    name: string
    status: string
    message: string
    count?: number
    severity: string
    fixable?: boolean
    fixAction?: string
}

interface DiagnosticsData {
    timestamp: string
    status: string
    checks: DiagnosticCheck[]
    stats: {
        totalUsers: number
        admin: number
        guru: number
        siswa: number
        wali: number
        totalStudents: number
        totalTeachers: number
        totalClasses: number
        activeSessions: number
        activeAcademicYear: string
    }
}

const severityConfig: Record<string, { icon: typeof CheckCircle2; color: string; bg: string; border: string }> = {
    success: { icon: CheckCircle2, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-500/10', border: 'border-emerald-200 dark:border-emerald-500/20' },
    info: { icon: Info, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-500/10', border: 'border-blue-200 dark:border-blue-500/20' },
    warning: { icon: AlertTriangle, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-500/10', border: 'border-amber-200 dark:border-amber-500/20' },
    critical: { icon: XCircle, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-500/10', border: 'border-red-200 dark:border-red-500/20' },
}

export default function ServicePage() {
    const { user } = useAuth()
    const router = useRouter()
    const [diagnostics, setDiagnostics] = useState<DiagnosticsData | null>(null)
    const [loading, setLoading] = useState(true)
    const [fixing, setFixing] = useState<string | null>(null)
    const [lastFixResult, setLastFixResult] = useState<{ action: string; message: string } | null>(null)

    useEffect(() => {
        if (user && user.role !== 'ADMIN') router.replace('/dashboard')
    }, [user, router])

    const fetchDiagnostics = async () => {
        setLoading(true)
        try {
            const res = await fetch('/api/admin/diagnostics')
            const data = await res.json()
            if (!data.error) setDiagnostics(data)
        } catch (err) {
            console.error('Error:', err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (user) fetchDiagnostics()
    }, [user])

    const handleFix = async (action: string) => {
        setFixing(action)
        setLastFixResult(null)
        try {
            const res = await fetch('/api/admin/diagnostics/fix', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action }),
            })
            const data = await res.json()
            setLastFixResult({ action, message: data.message || data.error })
            // Refresh diagnostics after fix
            await fetchDiagnostics()
        } catch (err) {
            setLastFixResult({ action, message: 'Terjadi kesalahan' })
        } finally {
            setFixing(null)
        }
    }

    if (loading && !diagnostics) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        )
    }

    const statusColor = diagnostics?.status === 'ok'
        ? 'from-emerald-500 to-emerald-700'
        : diagnostics?.status === 'warning'
            ? 'from-amber-500 to-amber-700'
            : 'from-red-500 to-red-700'

    const statusText = diagnostics?.status === 'ok'
        ? 'Semua Sistem Normal'
        : diagnostics?.status === 'warning'
            ? 'Ada Peringatan'
            : 'Perlu Perhatian'

    const statusIcon = diagnostics?.status === 'ok'
        ? CheckCircle2
        : diagnostics?.status === 'warning'
            ? AlertTriangle
            : XCircle

    const StatusIcon = statusIcon

    return (
        <div className="space-y-8 max-w-5xl mx-auto">
            {/* Header Banner */}
            <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-r ${statusColor} p-8 shadow-xl`}>
                <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10"></div>
                <div className="absolute -right-20 -top-20 w-80 h-80 bg-white/10 rounded-full blur-3xl"></div>
                <div className="relative flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
                            <Shield className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-white">Service & Diagnostik</h1>
                            <div className="flex items-center gap-2 mt-1">
                                <StatusIcon className="w-4 h-4 text-white/90" />
                                <p className="text-white/90">{statusText}</p>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={fetchDiagnostics}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur rounded-xl text-white text-sm font-semibold hover:bg-white/30 transition-all disabled:opacity-50"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                </div>
                {diagnostics && (
                    <p className="relative text-white/60 text-xs mt-3">
                        Terakhir diperiksa: {new Date(diagnostics.timestamp).toLocaleString('id-ID')}
                    </p>
                )}
            </div>

            {/* Quick Stats */}
            {diagnostics && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                    {[
                        { label: 'Total User', value: diagnostics.stats.totalUsers, icon: Users, color: 'text-blue-600' },
                        { label: 'Guru', value: diagnostics.stats.guru, icon: Users, color: 'text-purple-600' },
                        { label: 'Siswa', value: diagnostics.stats.siswa, icon: Users, color: 'text-green-600' },
                        { label: 'Kelas', value: diagnostics.stats.totalClasses, icon: BookOpen, color: 'text-orange-600' },
                        { label: 'Sesi Aktif', value: diagnostics.stats.activeSessions, icon: Clock, color: 'text-cyan-600' },
                    ].map((stat) => (
                        <Card key={stat.label} className="text-center py-4">
                            <stat.icon className={`w-5 h-5 mx-auto mb-1.5 ${stat.color}`} />
                            <div className="text-2xl font-bold text-text-main dark:text-white">{stat.value}</div>
                            <div className="text-[11px] text-text-secondary mt-0.5">{stat.label}</div>
                        </Card>
                    ))}
                </div>
            )}

            {/* Fix Result Toast */}
            {lastFixResult && (
                <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 flex items-center gap-3 animate-in fade-in">
                    <Wrench className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                    <p className="text-sm text-emerald-800 dark:text-emerald-300">{lastFixResult.message}</p>
                    <button onClick={() => setLastFixResult(null)} className="ml-auto text-emerald-600 hover:text-emerald-800 text-xs font-bold">✕</button>
                </div>
            )}

            {/* Diagnostic Checks */}
            {diagnostics && (
                <div className="space-y-4">
                    <div className="flex items-center gap-2">
                        <Database className="w-5 h-5 text-text-secondary" />
                        <h2 className="text-lg font-bold text-text-main dark:text-white">Pemeriksaan Kesehatan</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {diagnostics.checks.map((check) => {
                            const config = severityConfig[check.severity] || severityConfig.info
                            const Icon = config.icon
                            return (
                                <Card
                                    key={check.id}
                                    className={`border ${config.border} ${config.bg} transition-all hover:shadow-md`}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className={`flex-shrink-0 mt-0.5 ${config.color}`}>
                                            <Icon className="w-5 h-5" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-2">
                                                <h3 className="font-bold text-sm text-text-main dark:text-white">{check.name}</h3>
                                                {check.count !== undefined && check.count > 0 && (
                                                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${config.bg} ${config.color}`}>
                                                        {check.count}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-text-secondary dark:text-gray-400 mt-1 leading-relaxed">
                                                {check.message}
                                            </p>
                                            {check.fixable && check.count !== undefined && check.count > 0 && (
                                                <button
                                                    onClick={() => handleFix(check.fixAction!)}
                                                    disabled={fixing === check.fixAction}
                                                    className="mt-2.5 flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-xs font-bold rounded-lg hover:bg-primary-dark transition-all disabled:opacity-50"
                                                >
                                                    {fixing === check.fixAction ? (
                                                        <Loader2 className="w-3 h-3 animate-spin" />
                                                    ) : (
                                                        <Wrench className="w-3 h-3" />
                                                    )}
                                                    Perbaiki Sekarang
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </Card>
                            )
                        })}
                    </div>
                </div>
            )}

            {/* System Info */}
            {diagnostics && (
                <div className="space-y-4">
                    <div className="flex items-center gap-2">
                        <Server className="w-5 h-5 text-text-secondary" />
                        <h2 className="text-lg font-bold text-text-main dark:text-white">Informasi Sistem</h2>
                    </div>
                    <Card>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                                <p className="text-text-secondary text-xs mb-1">Tahun Ajaran Aktif</p>
                                <p className="font-bold text-text-main dark:text-white">{diagnostics.stats.activeAcademicYear}</p>
                            </div>
                            <div>
                                <p className="text-text-secondary text-xs mb-1">Admin</p>
                                <p className="font-bold text-text-main dark:text-white">{diagnostics.stats.admin}</p>
                            </div>
                            <div>
                                <p className="text-text-secondary text-xs mb-1">Wali Murid</p>
                                <p className="font-bold text-text-main dark:text-white">{diagnostics.stats.wali}</p>
                            </div>
                            <div>
                                <p className="text-text-secondary text-xs mb-1">Total Guru (Record)</p>
                                <p className="font-bold text-text-main dark:text-white">{diagnostics.stats.totalTeachers}</p>
                            </div>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    )
}
