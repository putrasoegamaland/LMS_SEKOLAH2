'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { PageHeader, Button } from '@/components/ui'
import Card from '@/components/ui/Card'
import { AcademicYear } from '@/lib/types'
import {
    TickSquare as CheckCircle, ChevronRight, Calendar, ArrowRight,
    Document as GraduationCap, Danger as AlertTriangle
} from 'react-iconly'
import {
    Circle, Copy, Loader2, ArrowLeft,
    Sparkles, ExternalLink, RefreshCw
} from 'lucide-react'
import Link from 'next/link'

interface StepStatus {
    completed: boolean
    loading: boolean
    detail: string
}

export default function PergantianTahunPage() {
    const router = useRouter()
    const [years, setYears] = useState<AcademicYear[]>([])
    const [loading, setLoading] = useState(true)

    // Step statuses
    const [steps, setSteps] = useState<StepStatus[]>([
        { completed: false, loading: false, detail: '' },
        { completed: false, loading: false, detail: '' },
        { completed: false, loading: false, detail: '' },
        { completed: false, loading: false, detail: '' },
    ])

    // Step 1: Complete old year
    const [completingYear, setCompletingYear] = useState(false)

    // Step 2: Create new year
    const [newYearName, setNewYearName] = useState('')
    const [creatingYear, setCreatingYear] = useState(false)

    // Step 4: Copy assignments
    const [copyingAssignments, setCopyingAssignments] = useState(false)
    const [copyResult, setCopyResult] = useState<{ copied: number; skipped: number; total: number } | null>(null)
    const [sourceYearId, setSourceYearId] = useState<string>('')

    const activeYear = years.find(y => y.is_active)
    const completedYears = years.filter(y => y.status === 'COMPLETED').sort((a, b) =>
        new Date(b.end_date || b.created_at).getTime() - new Date(a.end_date || a.created_at).getTime()
    )
    const lastCompletedYear = completedYears[0]
    const plannedYears = years.filter(y => y.status === 'PLANNED')

    const fetchData = async () => {
        try {
            setLoading(true)
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
        fetchData()
    }, [])

    // Auto-detect step statuses whenever years data changes
    useEffect(() => {
        if (loading || years.length === 0) return
        detectStepStatuses()
    }, [years, loading])

    const detectStepStatuses = async () => {
        const newSteps = [...steps]

        // Step 1: Is the old year completed? (Check if there's a completed year and no leftover active old year)
        const hasCompletedYear = completedYears.length > 0
        const hasActiveYear = !!activeYear
        newSteps[0] = {
            completed: hasCompletedYear,
            loading: false,
            detail: hasCompletedYear
                ? `✅ ${lastCompletedYear?.name} sudah diselesaikan`
                : hasActiveYear
                    ? `⏳ ${activeYear?.name} masih aktif — selesaikan dulu`
                    : '⚠️ Tidak ada tahun ajaran'
        }

        // Step 2: Is there a new active year?
        newSteps[1] = {
            completed: hasActiveYear && hasCompletedYear,
            loading: false,
            detail: hasActiveYear && hasCompletedYear
                ? `✅ ${activeYear?.name} sudah aktif`
                : hasActiveYear && !hasCompletedYear
                    ? `⏳ Selesaikan tahun lama dulu sebelum membuat tahun baru`
                    : '⬜ Buat tahun ajaran baru'
        }

        // Step 3: Check kenaikan kelas (check for PROMOTED enrollments in current year)
        if (hasActiveYear) {
            try {
                const enrollRes = await fetch(`/api/student-enrollments?check_promoted=true`)
                // For now, just show a link - we can't easily detect this without a new API
                newSteps[2] = {
                    completed: false,
                    loading: false,
                    detail: hasCompletedYear && hasActiveYear
                        ? '⬜ Proses kenaikan kelas jika belum'
                        : '⏳ Selesaikan langkah 1 & 2 dulu'
                }
            } catch {
                newSteps[2] = { completed: false, loading: false, detail: '⬜ Cek halaman kenaikan kelas' }
            }
        } else {
            newSteps[2] = { completed: false, loading: false, detail: '⏳ Buat tahun ajaran baru dulu' }
        }

        // Step 4: Check teaching assignments in new year
        if (hasActiveYear) {
            try {
                const taRes = await fetch(`/api/teaching-assignments?academic_year_id=${activeYear?.id}`)
                const taData = await taRes.json()
                const count = Array.isArray(taData) ? taData.length : 0

                newSteps[3] = {
                    completed: count > 0,
                    loading: false,
                    detail: count > 0
                        ? `✅ ${count} penugasan sudah ada di ${activeYear?.name}`
                        : '⬜ Belum ada penugasan — salin dari tahun lalu'
                }
            } catch {
                newSteps[3] = { completed: false, loading: false, detail: '⬜ Cek penugasan mengajar' }
            }
        } else {
            newSteps[3] = { completed: false, loading: false, detail: '⏳ Buat tahun ajaran baru dulu' }
        }

        setSteps(newSteps)
    }

    // Step 1: Complete the active year
    const handleCompleteYear = async () => {
        if (!activeYear) return
        if (!confirm(`Yakin ingin menyelesaikan tahun ajaran ${activeYear.name}? Status akan berubah menjadi SELESAI dan tidak bisa di-edit lagi.`)) return

        setCompletingYear(true)
        try {
            const res = await fetch(`/api/academic-years/${activeYear.id}/complete`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' }
            })

            if (res.ok) {
                await fetchData() // Refresh
            } else {
                const err = await res.json()
                alert(`Error: ${err.error}`)
            }
        } catch (error) {
            alert('Terjadi error saat menyelesaikan tahun ajaran')
        } finally {
            setCompletingYear(false)
        }
    }

    // Step 2: Create and activate new year
    const handleCreateYear = async () => {
        if (!newYearName) {
            alert('Pilih nama tahun ajaran baru')
            return
        }

        setCreatingYear(true)
        try {
            const startDate = new Date()
            const endDate = new Date(startDate)
            endDate.setFullYear(endDate.getFullYear() + 1)

            const res = await fetch('/api/academic-years', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: newYearName,
                    start_date: startDate.toISOString().split('T')[0],
                    end_date: endDate.toISOString().split('T')[0],
                    status: 'ACTIVE',
                    is_active: true
                })
            })

            if (res.ok) {
                await fetchData()
                setNewYearName('')
            } else {
                const err = await res.json()
                alert(`Error: ${err.error}`)
            }
        } catch (error) {
            alert('Terjadi error saat membuat tahun ajaran baru')
        } finally {
            setCreatingYear(false)
        }
    }

    // Step 4: Copy assignments
    const handleCopyAssignments = async () => {
        const fromId = sourceYearId || lastCompletedYear?.id
        if (!fromId || !activeYear) {
            alert('Tidak ada tahun sumber atau tahun aktif')
            return
        }

        setCopyingAssignments(true)
        setCopyResult(null)
        try {
            const res = await fetch('/api/teaching-assignments/copy-assignments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    from_year_id: fromId,
                    to_year_id: activeYear.id
                })
            })

            const data = await res.json()
            if (res.ok) {
                setCopyResult({ copied: data.copied, skipped: data.skipped, total: data.total })
                await detectStepStatuses()
            } else {
                alert(`Error: ${data.error}`)
            }
        } catch (error) {
            alert('Terjadi error saat menyalin penugasan')
        } finally {
            setCopyingAssignments(false)
        }
    }

    // Generate year name options
    const getYearNameOptions = () => {
        const currentYear = new Date().getFullYear()
        const startYear = currentYear - 1
        const endYear = currentYear + 5
        const existingNames = years.map(y => y.name)
        const options: string[] = []

        for (let y = endYear; y >= startYear; y--) {
            const name = `${y}/${y + 1}`
            if (!existingNames.includes(name)) options.push(name)
        }
        return options
    }

    const allStepsCompleted = steps.every(s => s.completed)

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="space-y-8 max-w-4xl mx-auto">
            <PageHeader
                title="Pergantian Tahun Ajaran"
                subtitle="Panduan langkah demi langkah untuk proses pergantian tahun ajaran"
            />

            {/* Status Overview */}
            <Card className={`border-2 ${allStepsCompleted ? 'border-green-500/30 bg-green-50/50 dark:bg-green-900/10' : 'border-amber-500/30 bg-amber-50/50 dark:bg-amber-900/10'}`}>
                <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${allStepsCompleted ? 'bg-green-100 dark:bg-green-900/30' : 'bg-amber-100 dark:bg-amber-900/30'}`}>
                        {allStepsCompleted ? (
                            <Sparkles className="w-7 h-7 text-green-600 dark:text-green-400" />
                        ) : (
                            <RefreshCw className="w-7 h-7 text-amber-600 dark:text-amber-400" />
                        )}
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-text-main dark:text-white">
                            {allStepsCompleted ? '🎉 Pergantian Tahun Ajaran Selesai!' : 'Proses Pergantian Tahun Ajaran'}
                        </h2>
                        <p className="text-sm text-text-secondary dark:text-zinc-400">
                            {allStepsCompleted
                                ? 'Semua langkah sudah selesai. Sistem siap untuk tahun ajaran baru.'
                                : `${steps.filter(s => s.completed).length} dari 4 langkah selesai`
                            }
                        </p>
                    </div>
                </div>

                {/* Progress bar */}
                <div className="mt-4 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                        className={`h-full rounded-full transition-all duration-500 ${allStepsCompleted ? 'bg-green-500' : 'bg-amber-500'}`}
                        style={{ width: `${(steps.filter(s => s.completed).length / 4) * 100}%` }}
                    />
                </div>
            </Card>

            {/* Step 1: Complete Old Year */}
            <Card className={`border-2 transition-all ${steps[0].completed ? 'border-green-500/20' : 'border-primary/20'}`}>
                <div className="flex items-start gap-4">
                    <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-sm ${steps[0].completed ? 'bg-green-500' : 'bg-primary'}`}>
                        {steps[0].completed ? <CheckCircle set="bold" primaryColor="currentColor" size={20} /> : '1'}
                    </div>
                    <div className="flex-1">
                        <h3 className="text-lg font-bold text-text-main dark:text-white mb-1">
                            Selesaikan Tahun Ajaran Lama
                        </h3>
                        <p className="text-sm text-text-secondary dark:text-zinc-400 mb-3">
                            {steps[0].detail}
                        </p>

                        {!steps[0].completed && activeYear && (
                            <div className="flex items-center gap-3">
                                <div className="px-4 py-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl text-sm font-medium text-indigo-600 dark:text-indigo-400">
                                    📅 {activeYear.name} ({activeYear.status})
                                </div>
                                <Button
                                    onClick={handleCompleteYear}
                                    disabled={completingYear}
                                    className="bg-amber-500 hover:bg-amber-600 text-white"
                                >
                                    {completingYear ? (
                                        <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Memproses...</>
                                    ) : (
                                        <>✅ Selesaikan Tahun Ini</>
                                    )}
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </Card>

            {/* Step 2: Create New Year */}
            <Card className={`border-2 transition-all ${steps[1].completed ? 'border-green-500/20' : steps[0].completed ? 'border-emerald-500/20' : 'border-slate-200 dark:border-slate-700 opacity-60'}`}>
                <div className="flex items-start gap-4">
                    <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-sm ${steps[1].completed ? 'bg-green-500' : steps[0].completed ? 'bg-primary' : 'bg-gray-400'}`}>
                        {steps[1].completed ? <CheckCircle set="bold" primaryColor="currentColor" size={20} /> : '2'}
                    </div>
                    <div className="flex-1">
                        <h3 className="text-lg font-bold text-text-main dark:text-white mb-1">
                            Buat & Aktifkan Tahun Ajaran Baru
                        </h3>
                        <p className="text-sm text-text-secondary dark:text-zinc-400 mb-3">
                            {steps[1].detail}
                        </p>

                        {steps[0].completed && !steps[1].completed && (
                            <div className="flex items-center gap-3 flex-wrap">
                                <div className="relative">
                                    <select
                                        value={newYearName}
                                        onChange={(e) => setNewYearName(e.target.value)}
                                        className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all appearance-none pr-10 min-w-[200px]"
                                    >
                                        <option value="">Pilih tahun...</option>
                                        {getYearNameOptions().map(name => (
                                            <option key={name} value={name}>📅 {name}</option>
                                        ))}
                                    </select>
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-text-secondary">▼</div>
                                </div>
                                <Button
                                    onClick={handleCreateYear}
                                    disabled={creatingYear || !newYearName}
                                >
                                    {creatingYear ? (
                                        <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Membuat...</>
                                    ) : (
                                        <><Calendar set="bold" primaryColor="currentColor" size={16} /> Buat &amp; Aktifkan</>
                                    )}
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </Card>

            {/* Step 3: Kenaikan Kelas */}
            <Card className={`border-2 transition-all ${steps[2].completed ? 'border-green-500/20' : steps[1].completed ? 'border-emerald-500/20' : 'border-slate-200 dark:border-slate-700 opacity-60'}`}>
                <div className="flex items-start gap-4">
                    <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-sm ${steps[2].completed ? 'bg-green-500' : steps[1].completed ? 'bg-primary' : 'bg-gray-400'}`}>
                        {steps[2].completed ? <CheckCircle set="bold" primaryColor="currentColor" size={20} /> : '3'}
                    </div>
                    <div className="flex-1">
                        <h3 className="text-lg font-bold text-text-main dark:text-white mb-1">
                            Proses Kenaikan Kelas
                        </h3>
                        <p className="text-sm text-text-secondary dark:text-zinc-400 mb-3">
                            {steps[2].detail}
                        </p>

                        {steps[1].completed && (
                            <Link href="/dashboard/admin/kenaikan-kelas">
                                <Button className="bg-purple-500 hover:bg-purple-600 text-white">
                                    <GraduationCap set="bold" primaryColor="currentColor" size={16} />
                                    Buka Halaman Kenaikan Kelas
                                    <ExternalLink className="w-3 h-3 ml-2" />
                                </Button>
                            </Link>
                        )}
                    </div>
                </div>
            </Card>

            {/* Step 4: Copy Assignments */}
            <Card className={`border-2 transition-all ${steps[3].completed ? 'border-green-500/20' : steps[1].completed ? 'border-emerald-500/20' : 'border-slate-200 dark:border-slate-700 opacity-60'}`}>
                <div className="flex items-start gap-4">
                    <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-sm ${steps[3].completed ? 'bg-green-500' : steps[1].completed ? 'bg-primary' : 'bg-gray-400'}`}>
                        {steps[3].completed ? <CheckCircle set="bold" primaryColor="currentColor" size={20} /> : '4'}
                    </div>
                    <div className="flex-1">
                        <h3 className="text-lg font-bold text-text-main dark:text-white mb-1">
                            Salin Penugasan Mengajar
                        </h3>
                        <p className="text-sm text-text-secondary dark:text-zinc-400 mb-3">
                            {steps[3].detail}
                        </p>

                        {steps[1].completed && (
                            <div className="space-y-4">
                                {/* Source year selector */}
                                <div className="flex items-center gap-3 flex-wrap">
                                    <span className="text-sm text-text-secondary dark:text-zinc-400">Salin dari:</span>
                                    <div className="relative">
                                        <select
                                            value={sourceYearId || lastCompletedYear?.id || ''}
                                            onChange={(e) => setSourceYearId(e.target.value)}
                                            className="px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all appearance-none pr-10 min-w-[200px]"
                                        >
                                            {completedYears.map(y => (
                                                <option key={y.id} value={y.id}>📅 {y.name}</option>
                                            ))}
                                            {/* Also show active year if different */}
                                            {years.filter(y => y.status !== 'COMPLETED' && y.id !== activeYear?.id).map(y => (
                                                <option key={y.id} value={y.id}>📅 {y.name} ({y.status})</option>
                                            ))}
                                        </select>
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-text-secondary">▼</div>
                                    </div>

                                    <ArrowRight set="bold" primaryColor="currentColor" size={20} />

                                    <div className="px-4 py-2 bg-green-50 dark:bg-green-900/20 rounded-xl text-sm font-medium text-green-600 dark:text-green-400">
                                        📅 {activeYear?.name}
                                    </div>

                                    <Button
                                        onClick={handleCopyAssignments}
                                        disabled={copyingAssignments}
                                        className="bg-teal-500 hover:bg-teal-600 text-white"
                                    >
                                        {copyingAssignments ? (
                                            <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Menyalin...</>
                                        ) : (
                                            <><Copy className="w-4 h-4 mr-2" /> Salin Penugasan</>
                                        )}
                                    </Button>
                                </div>

                                {/* Copy result */}
                                {copyResult && (
                                    <div className={`p-4 rounded-xl border ${copyResult.copied > 0 ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-500/20' : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-500/20'}`}>
                                        <p className="font-bold text-text-main dark:text-white">
                                            {copyResult.copied > 0 ? '✅' : '⚠️'} Hasil Penyalinan
                                        </p>
                                        <div className="grid grid-cols-3 gap-4 mt-2">
                                            <div className="text-center">
                                                <p className="text-2xl font-bold text-green-600 dark:text-green-400">{copyResult.copied}</p>
                                                <p className="text-xs text-text-secondary">Disalin</p>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{copyResult.skipped}</p>
                                                <p className="text-xs text-text-secondary">Sudah Ada</p>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-2xl font-bold text-text-main dark:text-white">{copyResult.total}</p>
                                                <p className="text-xs text-text-secondary">Total Sumber</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Link to penugasan page */}
                                <div className="flex items-center gap-2">
                                    <Link href="/dashboard/admin/penugasan" className="text-sm text-primary hover:underline inline-flex items-center gap-1">
                                        Buka Halaman Penugasan untuk edit detail
                                        <ExternalLink className="w-3 h-3" />
                                    </Link>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </Card>

            {/* Back button */}
            <div className="flex justify-center pt-4">
                <Link href="/dashboard/admin">
                    <Button variant="outline" className="gap-2">
                        <ArrowLeft className="w-4 h-4" />
                        Kembali ke Dashboard Admin
                    </Button>
                </Link>
            </div>
        </div>
    )
}
