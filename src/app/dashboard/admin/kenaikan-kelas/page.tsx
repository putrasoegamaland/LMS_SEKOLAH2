'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { PageHeader, Modal, Button, EmptyState } from '@/components/ui'
import Card from '@/components/ui/Card'
import { AcademicYear, Class, SchoolLevel } from '@/lib/types'
import {
    ArrowRight, People as Users, TickSquare as CheckCircle, CloseSquare as XCircle,
    Danger as AlertTriangle, Document as GraduationCap, ArrowUpSquare as ArrowUpRight,
    ChevronDown, ChevronRight, Search, Download, ShieldFail as ShieldAlert
} from 'react-iconly'
import { Loader2, UserCheck, UserX } from 'lucide-react'

interface Student {
    id: string
    nis: string | null
    class_id: string | null
    angkatan: string | null
    school_level: SchoolLevel | null
    status: string
    user: {
        id: string
        username: string
        full_name: string | null
    }
    class: { id: string; name: string; grade_level: number | null; school_level: SchoolLevel | null } | null
}

interface ClassGroup {
    sourceClass: Class
    students: Student[]
    targetClassId: string
    targetClassName: string
    action: 'PROMOTE' | 'GRADUATE' | 'TRANSITION'
    // Per-student exclusions
    excludedStudents: Set<string>
    // Status tracking
    isCompleted: boolean
    completedCount: number
}

export default function KenaikanKelasPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [processing, setProcessing] = useState(false)
    const [academicYears, setAcademicYears] = useState<AcademicYear[]>([])
    const [classes, setClasses] = useState<Class[]>([])
    const [students, setStudents] = useState<Student[]>([])
    const [classGroups, setClassGroups] = useState<ClassGroup[]>([])
    const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set())
    const [activeYear, setActiveYear] = useState<AcademicYear | null>(null)
    const [targetYear, setTargetYear] = useState<AcademicYear | null>(null)

    // Expanded accordion state
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())

    // Search
    const [searchQuery, setSearchQuery] = useState('')

    // Confirmation modal
    const [showConfirmModal, setShowConfirmModal] = useState(false)

    // Results
    const [showResultModal, setShowResultModal] = useState(false)
    const [results, setResults] = useState<{ success: number; failed: number; errors: string[] }>({ success: 0, failed: 0, errors: [] })

    // Processing progress
    const [processProgress, setProcessProgress] = useState({ current: 0, total: 0 })

    const fetchData = async () => {
        try {
            const [yearsRes, classesRes, studentsRes] = await Promise.all([
                fetch('/api/academic-years'),
                fetch('/api/classes'),
                fetch('/api/students?status=ACTIVE')
            ])

            const [yearsData, classesData, studentsData] = await Promise.all([
                yearsRes.json(),
                classesRes.json(),
                studentsRes.json()
            ])

            const years = Array.isArray(yearsData) ? yearsData : []
            const classList = Array.isArray(classesData) ? classesData : []
            const studentList = Array.isArray(studentsData) ? studentsData : []

            setAcademicYears(years)
            setClasses(classList)
            setStudents(studentList)

            // Find active year
            const active = years.find((y: AcademicYear) => y.is_active || y.status === 'ACTIVE')
            setActiveYear(active || null)

            // Find next planned year (for target)
            const planned = years.find((y: AcademicYear) => y.status === 'PLANNED')
            setTargetYear(planned || null)

            // Generate class groups
            if (active) {
                generateClassGroups(classList, studentList, active)
            }
        } catch (error) {
            console.error('Error fetching data:', error)
        } finally {
            setLoading(false)
        }
    }

    const generateClassGroups = (classList: Class[], studentList: Student[], currentYear: AcademicYear) => {
        // Get classes from current active year
        const currentClasses = classList.filter(c => c.academic_year_id === currentYear.id)

        // Group students by class
        const groups: ClassGroup[] = []

        for (const cls of currentClasses) {
            const classStudents = studentList.filter(s => s.class_id === cls.id && s.status === 'ACTIVE')

            if (classStudents.length === 0) continue

            // Determine target based on grade level
            let action: 'PROMOTE' | 'GRADUATE' | 'TRANSITION' = 'PROMOTE'
            let targetClassName = ''
            let targetClassId = ''

            const gradeLevel = cls.grade_level || 0
            const schoolLevel = cls.school_level

            if (gradeLevel === 3) {
                // Final year
                if (schoolLevel === 'SMP') {
                    action = 'TRANSITION'
                    targetClassName = 'Transisi ke SMA'
                } else {
                    action = 'GRADUATE'
                    targetClassName = 'Lulus (Alumni)'
                }
            } else {
                // Find next grade class
                action = 'PROMOTE'
                const nextGrade = gradeLevel + 1
                // Try to find matching class with same section letter
                const classSection = cls.name.replace(/[^A-Za-z]/g, '').slice(-1) || 'A'
                const nextClass = classList.find(c =>
                    c.grade_level === nextGrade &&
                    c.school_level === schoolLevel &&
                    c.name.includes(classSection)
                ) || classList.find(c =>
                    c.grade_level === nextGrade &&
                    c.school_level === schoolLevel
                )

                if (nextClass) {
                    targetClassId = nextClass.id
                    targetClassName = nextClass.name
                } else {
                    targetClassName = `Kelas ${schoolLevel === 'SMP' ? 'MP' : 'MA'}${nextGrade} (belum ada)`
                }
            }

            groups.push({
                sourceClass: cls,
                students: classStudents,
                targetClassId,
                targetClassName,
                action,
                excludedStudents: new Set(),
                isCompleted: false,
                completedCount: 0
            })
        }

        // Sort by school level then grade level
        groups.sort((a, b) => {
            if (a.sourceClass.school_level !== b.sourceClass.school_level) {
                return a.sourceClass.school_level === 'SMP' ? -1 : 1
            }
            return (a.sourceClass.grade_level || 0) - (b.sourceClass.grade_level || 0)
        })

        setClassGroups(groups)
    }

    useEffect(() => {
        fetchData()
    }, [])

    // Get possible target classes for a group (for dropdown)
    const getTargetOptions = (group: ClassGroup): Class[] => {
        if (group.action !== 'PROMOTE') return []
        const nextGrade = (group.sourceClass.grade_level || 0) + 1
        return classes.filter(c =>
            c.school_level === group.sourceClass.school_level &&
            c.grade_level === nextGrade
        )
    }

    const toggleGroup = (classId: string) => {
        const group = classGroups.find(g => g.sourceClass.id === classId)
        if (group?.isCompleted) return // Can't select completed groups
        const newSelected = new Set(selectedGroups)
        if (newSelected.has(classId)) {
            newSelected.delete(classId)
        } else {
            newSelected.add(classId)
        }
        setSelectedGroups(newSelected)
    }

    const toggleExpand = (classId: string) => {
        const newExpanded = new Set(expandedGroups)
        if (newExpanded.has(classId)) {
            newExpanded.delete(classId)
        } else {
            newExpanded.add(classId)
        }
        setExpandedGroups(newExpanded)
    }

    const toggleStudentExclusion = (classId: string, studentId: string) => {
        setClassGroups(prev => prev.map(g => {
            if (g.sourceClass.id !== classId) return g
            const newExcluded = new Set(g.excludedStudents)
            if (newExcluded.has(studentId)) {
                newExcluded.delete(studentId)
            } else {
                newExcluded.add(studentId)
            }
            return { ...g, excludedStudents: newExcluded }
        }))
    }

    const updateTargetClass = (classId: string, targetId: string) => {
        const targetClass = classes.find(c => c.id === targetId)
        setClassGroups(prev => prev.map(g => {
            if (g.sourceClass.id !== classId) return g
            return {
                ...g,
                targetClassId: targetId,
                targetClassName: targetClass?.name || g.targetClassName
            }
        }))
    }

    const selectAll = () => {
        const selectableGroups = classGroups.filter(g => !g.isCompleted)
        if (selectedGroups.size === selectableGroups.length) {
            setSelectedGroups(new Set())
        } else {
            setSelectedGroups(new Set(selectableGroups.map(g => g.sourceClass.id)))
        }
    }

    // Show confirmation modal instead of processing directly
    const handleProcessClick = () => {
        if (selectedGroups.size === 0) return
        setShowConfirmModal(true)
    }

    const handleConfirmProcess = async () => {
        setShowConfirmModal(false)
        setProcessing(true)
        const successIds: string[] = []
        const errors: string[] = []

        // Calculate total students to process
        const toProcess = classGroups
            .filter(g => selectedGroups.has(g.sourceClass.id))
            .flatMap(g => g.students.filter(s => !g.excludedStudents.has(s.id)))

        setProcessProgress({ current: 0, total: toProcess.length })

        try {
            let processedCount = 0

            for (const group of classGroups) {
                if (!selectedGroups.has(group.sourceClass.id)) continue

                const studentsToProcess = group.students.filter(s => !group.excludedStudents.has(s.id))

                for (const student of studentsToProcess) {
                    try {
                        if (group.action === 'GRADUATE') {
                            // Use proper graduate endpoint
                            const res = await fetch(`/api/students/${student.id}/graduate`, {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    notes: `Lulus dari ${group.sourceClass.name} - ${activeYear?.name}`
                                })
                            })
                            if (res.ok) {
                                successIds.push(student.id)
                            } else {
                                const errData = await res.json()
                                errors.push(`Gagal memproses ${student.user.full_name}: ${errData.error}`)
                            }
                        } else if (group.action === 'TRANSITION') {
                            // Transition SMP → SMA: graduate from SMP first, then they'll be reassigned
                            const res = await fetch(`/api/students/${student.id}/graduate`, {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    notes: `Transisi SMP → SMA dari ${group.sourceClass.name} - ${activeYear?.name}`
                                })
                            })
                            if (res.ok) {
                                // After graduating from SMP, update school_level to SMA
                                await fetch(`/api/students/${student.id}`, {
                                    method: 'PUT',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                        school_level: 'SMA',
                                        status: 'ACTIVE'
                                    })
                                })
                                successIds.push(student.id)
                            } else {
                                const errData = await res.json()
                                errors.push(`Gagal memproses ${student.user.full_name}: ${errData.error}`)
                            }
                        } else if (group.targetClassId) {
                            // Use proper promote endpoint
                            const res = await fetch(`/api/students/${student.id}/promote`, {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    to_class_id: group.targetClassId,
                                    to_academic_year_id: targetYear?.id || activeYear?.id,
                                    notes: `Naik kelas dari ${group.sourceClass.name} ke ${group.targetClassName} - ${activeYear?.name}`
                                })
                            })
                            if (res.ok) {
                                successIds.push(student.id)
                            } else {
                                const errData = await res.json()
                                errors.push(`Gagal memproses ${student.user.full_name}: ${errData.error}`)
                            }
                        } else {
                            errors.push(`${student.user.full_name}: Target kelas belum tersedia`)
                        }
                    } catch (err) {
                        errors.push(`${student.user.full_name}: Error tidak terduga`)
                    }

                    processedCount++
                    setProcessProgress({ current: processedCount, total: toProcess.length })
                }

                // Mark group as completed if all students were processed
                if (studentsToProcess.every(s => successIds.includes(s.id))) {
                    setClassGroups(prev => prev.map(g =>
                        g.sourceClass.id === group.sourceClass.id
                            ? { ...g, isCompleted: true, completedCount: studentsToProcess.length }
                            : g
                    ))
                }
            }

            setResults({
                success: successIds.length,
                failed: errors.length,
                errors
            })
            setShowResultModal(true)

            // Refresh data
            await fetchData()
            setSelectedGroups(new Set())
        } finally {
            setProcessing(false)
            setProcessProgress({ current: 0, total: 0 })
        }
    }

    // Export CSV
    const handleExportCSV = () => {
        const rows: string[][] = [['No', 'Nama Siswa', 'NIS', 'Kelas Asal', 'Kelas Tujuan', 'Aksi', 'Status']]

        let no = 1
        classGroups.forEach(group => {
            group.students.forEach(student => {
                const isExcluded = group.excludedStudents.has(student.id)
                const actionLabel = group.action === 'PROMOTE' ? 'Naik Kelas'
                    : group.action === 'GRADUATE' ? 'Lulus'
                        : 'Transisi SMA'

                rows.push([
                    String(no++),
                    student.user.full_name || student.user.username,
                    student.nis || '-',
                    group.sourceClass.name,
                    group.targetClassName,
                    actionLabel,
                    isExcluded ? 'Tinggal Kelas' : (group.isCompleted ? 'Selesai' : 'Menunggu')
                ])
            })
        })

        const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n')
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `kenaikan-kelas-${activeYear?.name || 'report'}.csv`
        a.click()
        URL.revokeObjectURL(url)
    }

    const getActionBadge = (action: 'PROMOTE' | 'GRADUATE' | 'TRANSITION') => {
        switch (action) {
            case 'PROMOTE':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-full text-xs font-bold">
                        <ArrowUpRight set="bold" primaryColor="currentColor" size={12} />
                        Naik Kelas
                    </span>
                )
            case 'GRADUATE':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-500/10 text-green-600 dark:text-green-400 rounded-full text-xs font-bold">
                        <GraduationCap set="bold" primaryColor="currentColor" size={12} />
                        Lulus
                    </span>
                )
            case 'TRANSITION':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-full text-xs font-bold">
                        <ArrowRight set="bold" primaryColor="currentColor" size={12} />
                        Transisi SMA
                    </span>
                )
        }
    }

    // Filtered groups based on search
    const filteredGroups = useMemo(() => {
        if (!searchQuery.trim()) return classGroups
        const q = searchQuery.toLowerCase()
        return classGroups.filter(g =>
            g.sourceClass.name.toLowerCase().includes(q) ||
            g.targetClassName.toLowerCase().includes(q)
        )
    }, [classGroups, searchQuery])

    const smpGroups = filteredGroups.filter(g => g.sourceClass.school_level === 'SMP')
    const smaGroups = filteredGroups.filter(g => g.sourceClass.school_level === 'SMA')

    const totalSelectedStudents = classGroups
        .filter(g => selectedGroups.has(g.sourceClass.id))
        .reduce((acc, g) => acc + g.students.length - g.excludedStudents.size, 0)

    // Confirmation modal stats
    const confirmStats = useMemo(() => {
        const groups = classGroups.filter(g => selectedGroups.has(g.sourceClass.id))
        return {
            promote: groups.filter(g => g.action === 'PROMOTE').reduce((a, g) => a + g.students.length - g.excludedStudents.size, 0),
            graduate: groups.filter(g => g.action === 'GRADUATE').reduce((a, g) => a + g.students.length - g.excludedStudents.size, 0),
            transition: groups.filter(g => g.action === 'TRANSITION').reduce((a, g) => a + g.students.length - g.excludedStudents.size, 0),
            excluded: groups.reduce((a, g) => a + g.excludedStudents.size, 0),
            total: groups.reduce((a, g) => a + g.students.length - g.excludedStudents.size, 0),
            classes: groups.length
        }
    }, [classGroups, selectedGroups])

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        )
    }

    const renderGroupRow = (group: ClassGroup) => {
        const isSelected = selectedGroups.has(group.sourceClass.id)
        const isExpanded = expandedGroups.has(group.sourceClass.id)
        const activeStudents = group.students.length - group.excludedStudents.size
        const targetOptions = getTargetOptions(group)

        return (
            <div key={group.sourceClass.id} className={`transition-colors ${group.isCompleted ? 'opacity-60' : ''}`}>
                {/* Main row */}
                <div
                    className={`p-4 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${isSelected ? 'bg-emerald-50/50 dark:bg-emerald-900/10' : ''} ${group.isCompleted ? 'bg-green-50 dark:bg-green-900/10' : ''}`}
                >
                    {/* Checkbox */}
                    <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleGroup(group.sourceClass.id)}
                        disabled={group.isCompleted}
                        className="w-5 h-5 rounded border-slate-300 dark:border-slate-600 text-emerald-600 focus:ring-emerald-500/50 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    />

                    {/* Expand toggle */}
                    <button
                        onClick={(e) => { e.stopPropagation(); toggleExpand(group.sourceClass.id) }}
                        className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                        {isExpanded
                            ? <ChevronDown set="bold" primaryColor="currentColor" size={16} />
                            : <ChevronRight set="bold" primaryColor="currentColor" size={16} />
                        }
                    </button>

                    {/* Source class info */}
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4 items-center">
                        <div className="md:col-span-3">
                            <p className="font-bold text-text-main dark:text-white">{group.sourceClass.name}</p>
                            <p className="text-xs text-text-secondary">
                                {activeStudents}/{group.students.length} siswa
                                {group.excludedStudents.size > 0 && (
                                    <span className="text-amber-500 ml-1">({group.excludedStudents.size} dikecualikan)</span>
                                )}
                            </p>
                        </div>

                        {/* Arrow */}
                        <div className="hidden md:flex md:col-span-1 items-center justify-center">
                            <ArrowRight set="bold" primaryColor="currentColor" size={16} />
                        </div>

                        {/* Target class (dropdown for PROMOTE, static for others) */}
                        <div className="md:col-span-4">
                            {group.action === 'PROMOTE' && targetOptions.length > 0 ? (
                                <div className="relative">
                                    <select
                                        value={group.targetClassId}
                                        onChange={(e) => updateTargetClass(group.sourceClass.id, e.target.value)}
                                        disabled={group.isCompleted}
                                        className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 appearance-none disabled:opacity-50"
                                    >
                                        {targetOptions.map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-text-secondary text-xs">▼</div>
                                </div>
                            ) : (
                                <p className="font-medium text-text-main dark:text-white">{group.targetClassName}</p>
                            )}
                        </div>

                        {/* Badge */}
                        <div className="md:col-span-2 flex justify-start md:justify-center">
                            {getActionBadge(group.action)}
                        </div>

                        {/* Status */}
                        <div className="md:col-span-2 flex justify-end">
                            {group.isCompleted ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-500/10 text-green-600 dark:text-green-400 rounded-full text-xs font-bold">
                                    <CheckCircle set="bold" primaryColor="currentColor" size={14} />
                                    Selesai ({group.completedCount})
                                </span>
                            ) : (
                                <span className="text-xs text-text-secondary">Menunggu</span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Expanded student list */}
                {isExpanded && (
                    <div className="bg-slate-50/50 dark:bg-slate-800/30 border-t border-slate-200 dark:border-slate-700">
                        <div className="px-4 py-2 flex items-center justify-between border-b border-slate-200 dark:border-slate-700">
                            <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">Daftar Siswa</span>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setClassGroups(prev => prev.map(g =>
                                        g.sourceClass.id === group.sourceClass.id
                                            ? { ...g, excludedStudents: new Set() }
                                            : g
                                    ))}
                                    className="text-xs text-primary hover:underline"
                                >
                                    Pilih Semua
                                </button>
                                <span className="text-xs text-text-secondary">|</span>
                                <button
                                    onClick={() => setClassGroups(prev => prev.map(g =>
                                        g.sourceClass.id === group.sourceClass.id
                                            ? { ...g, excludedStudents: new Set(g.students.map(s => s.id)) }
                                            : g
                                    ))}
                                    className="text-xs text-red-500 hover:underline"
                                >
                                    Batalkan Semua
                                </button>
                            </div>
                        </div>
                        {group.students.map((student, idx) => {
                            const isExcluded = group.excludedStudents.has(student.id)
                            return (
                                <div
                                    key={student.id}
                                    className={`flex items-center gap-3 px-6 py-2.5 hover:bg-secondary/5 transition-colors cursor-pointer ${isExcluded ? 'opacity-50' : ''}`}
                                    onClick={() => !group.isCompleted && toggleStudentExclusion(group.sourceClass.id, student.id)}
                                >
                                    <input
                                        type="checkbox"
                                        checked={!isExcluded}
                                        onChange={() => { }}
                                        disabled={group.isCompleted}
                                        className="w-4 h-4 rounded border-secondary text-primary focus:ring-primary/50 cursor-pointer"
                                    />
                                    <span className="text-xs text-text-secondary w-6 text-right">{idx + 1}.</span>
                                    <div className="flex-1">
                                        <span className={`text-sm ${isExcluded ? 'line-through text-text-secondary' : 'text-text-main dark:text-white'}`}>
                                            {student.user.full_name || student.user.username}
                                        </span>
                                    </div>
                                    <span className="text-xs text-text-secondary">{student.nis || '-'}</span>
                                    {isExcluded && (
                                        <span className="text-xs text-amber-500 font-medium flex items-center gap-1">
                                            <UserX className="w-3 h-3" />
                                            Tinggal
                                        </span>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title="Kenaikan Kelas"
                subtitle="Proses kenaikan kelas, transisi, dan kelulusan siswa"
                backHref="/dashboard/admin"
                icon={<div className="text-emerald-500"><ArrowUpRight set="bold" primaryColor="currentColor" size={24} /></div>}
            />

            {/* Active Year Info */}
            <Card className="p-4">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm text-text-secondary">Tahun Ajaran Aktif</p>
                        <p className="text-xl font-bold text-text-main dark:text-white">
                            {activeYear?.name || 'Tidak ada tahun ajaran aktif'}
                        </p>
                    </div>
                    {targetYear && (
                        <div className="text-right">
                            <p className="text-sm text-text-secondary">Target Tahun Ajaran</p>
                            <p className="text-xl font-bold text-primary">
                                {targetYear.name}
                            </p>
                        </div>
                    )}
                </div>
            </Card>

            {!activeYear ? (
                <Card className="p-6">
                    <EmptyState
                        icon={<div className="text-amber-500"><AlertTriangle set="bold" primaryColor="currentColor" size={48} /></div>}
                        title="Tidak Ada Tahun Ajaran Aktif"
                        description="Aktifkan tahun ajaran terlebih dahulu untuk melakukan kenaikan kelas"
                        action={
                            <Button onClick={() => router.push('/dashboard/admin/tahun-ajaran')}>
                                Kelola Tahun Ajaran
                            </Button>
                        }
                    />
                </Card>
            ) : classGroups.length === 0 ? (
                <Card className="p-6">
                    <EmptyState
                        icon={<div className="text-secondary"><Users set="bold" primaryColor="currentColor" size={48} /></div>}
                        title="Tidak Ada Siswa Aktif"
                        description="Tidak ada siswa aktif yang terdaftar di kelas pada tahun ajaran ini"
                        action={
                            <Button onClick={() => router.push('/dashboard/admin/siswa')}>
                                Kelola Siswa
                            </Button>
                        }
                    />
                </Card>
            ) : (
                <>
                    {/* Search + Controls */}
                    <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                        <div className="flex items-center gap-3 w-full sm:w-auto">
                            <Button variant="secondary" onClick={selectAll}>
                                {selectedGroups.size === classGroups.filter(g => !g.isCompleted).length && selectedGroups.size > 0
                                    ? 'Batalkan Semua'
                                    : 'Pilih Semua'}
                            </Button>
                            <div className="relative flex-1 sm:w-64">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary"><Search set="bold" primaryColor="currentColor" size={16} /></span>
                                <input
                                    type="text"
                                    placeholder="Cari kelas..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={handleExportCSV}
                                className="inline-flex items-center gap-1.5 px-3 py-2 text-sm text-text-secondary hover:text-text-main dark:hover:text-white hover:bg-secondary/10 rounded-lg transition-colors"
                            >
                                <Download set="bold" primaryColor="currentColor" size={16} />
                                Export CSV
                            </button>
                            <span className="text-sm text-text-secondary">
                                {selectedGroups.size} kelas • {totalSelectedStudents} siswa
                            </span>
                        </div>
                    </div>

                    {/* SMP Section */}
                    {smpGroups.length > 0 && (
                        <Card className="p-0 overflow-hidden">
                            <div className="bg-blue-500/10 px-6 py-3 border-b border-blue-500/20">
                                <h3 className="font-bold text-blue-600 dark:text-blue-400">🏫 SMP</h3>
                            </div>
                            <div className="divide-y divide-secondary/10">
                                {smpGroups.map(renderGroupRow)}
                            </div>
                        </Card>
                    )}

                    {/* SMA Section */}
                    {smaGroups.length > 0 && (
                        <Card className="p-0 overflow-hidden">
                            <div className="bg-purple-500/10 px-6 py-3 border-b border-purple-500/20">
                                <h3 className="font-bold text-purple-600 dark:text-purple-400">🎓 SMA</h3>
                            </div>
                            <div className="divide-y divide-secondary/10">
                                {smaGroups.map(renderGroupRow)}
                            </div>
                        </Card>
                    )}

                    {filteredGroups.length === 0 && searchQuery && (
                        <Card className="p-6">
                            <EmptyState
                                icon={<div className="text-secondary"><Search set="bold" primaryColor="currentColor" size={48} /></div>}
                                title="Tidak Ditemukan"
                                description={`Tidak ada kelas yang cocok dengan "${searchQuery}"`}
                            />
                        </Card>
                    )}

                    {/* Process Button */}
                    <div className="flex justify-end">
                        <Button
                            onClick={handleProcessClick}
                            loading={processing}
                            disabled={selectedGroups.size === 0 || processing}
                            icon={<CheckCircle set="bold" primaryColor="currentColor" size={20} />}
                            className="px-8"
                        >
                            {processing
                                ? `Memproses ${processProgress.current}/${processProgress.total}...`
                                : `Proses Kenaikan Kelas (${totalSelectedStudents} siswa)`
                            }
                        </Button>
                    </div>
                </>
            )}

            {/* Confirmation Modal */}
            <Modal
                open={showConfirmModal}
                onClose={() => setShowConfirmModal(false)}
                title="⚠️ Konfirmasi Kenaikan Kelas"
            >
                <div className="space-y-4">
                    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4 rounded-xl">
                        <div className="flex items-start gap-3">
                            <div className="text-amber-500 mt-0.5 flex-shrink-0"><ShieldAlert set="bold" primaryColor="currentColor" size={20} /></div>
                            <div>
                                <p className="font-bold text-amber-700 dark:text-amber-300 text-sm">Perhatian!</p>
                                <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">
                                    Proses ini akan memindahkan siswa ke kelas/status baru.
                                    Pastikan data sudah benar sebelum melanjutkan.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-secondary/5 border border-secondary/10 p-3 rounded-xl text-center">
                            <p className="text-2xl font-bold text-text-main dark:text-white">{confirmStats.classes}</p>
                            <p className="text-xs text-text-secondary">Kelas</p>
                        </div>
                        <div className="bg-secondary/5 border border-secondary/10 p-3 rounded-xl text-center">
                            <p className="text-2xl font-bold text-text-main dark:text-white">{confirmStats.total}</p>
                            <p className="text-xs text-text-secondary">Total Siswa</p>
                        </div>
                    </div>

                    <div className="space-y-2">
                        {confirmStats.promote > 0 && (
                            <div className="flex items-center justify-between text-sm">
                                <span className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                                    <ArrowUpRight set="bold" primaryColor="currentColor" size={16} /> Naik Kelas
                                </span>
                                <span className="font-bold text-text-main dark:text-white">{confirmStats.promote} siswa</span>
                            </div>
                        )}
                        {confirmStats.graduate > 0 && (
                            <div className="flex items-center justify-between text-sm">
                                <span className="flex items-center gap-2 text-green-600 dark:text-green-400">
                                    <GraduationCap set="bold" primaryColor="currentColor" size={16} /> Lulus
                                </span>
                                <span className="font-bold text-text-main dark:text-white">{confirmStats.graduate} siswa</span>
                            </div>
                        )}
                        {confirmStats.transition > 0 && (
                            <div className="flex items-center justify-between text-sm">
                                <span className="flex items-center gap-2 text-purple-600 dark:text-purple-400">
                                    <ArrowRight set="bold" primaryColor="currentColor" size={16} /> Transisi SMA
                                </span>
                                <span className="font-bold text-text-main dark:text-white">{confirmStats.transition} siswa</span>
                            </div>
                        )}
                        {confirmStats.excluded > 0 && (
                            <div className="flex items-center justify-between text-sm border-t border-secondary/10 pt-2">
                                <span className="flex items-center gap-2 text-amber-500">
                                    <UserX className="w-4 h-4" /> Dikecualikan (tinggal kelas)
                                </span>
                                <span className="font-bold text-amber-500">{confirmStats.excluded} siswa</span>
                            </div>
                        )}
                    </div>

                    <div className="flex gap-3 pt-2">
                        <Button
                            variant="secondary"
                            onClick={() => setShowConfirmModal(false)}
                            className="flex-1"
                        >
                            Batal
                        </Button>
                        <Button
                            onClick={handleConfirmProcess}
                            className="flex-1"
                            icon={<CheckCircle set="bold" primaryColor="currentColor" size={16} />}
                        >
                            Ya, Proses Sekarang
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Results Modal */}
            <Modal
                open={showResultModal}
                onClose={() => setShowResultModal(false)}
                title="📊 Hasil Proses Kenaikan Kelas"
            >
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4 rounded-xl text-center">
                            <div className="text-green-500 mx-auto mb-2"><CheckCircle set="bold" primaryColor="currentColor" size={32} /></div>
                            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{results.success}</p>
                            <p className="text-sm text-green-700 dark:text-green-300">Berhasil</p>
                        </div>
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 rounded-xl text-center">
                            <div className="text-red-500 mx-auto mb-2"><XCircle set="bold" primaryColor="currentColor" size={32} /></div>
                            <p className="text-2xl font-bold text-red-600 dark:text-red-400">{results.failed}</p>
                            <p className="text-sm text-red-700 dark:text-red-300">Gagal</p>
                        </div>
                    </div>

                    {results.errors.length > 0 && (
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 rounded-xl">
                            <p className="font-medium text-red-700 dark:text-red-300 mb-2">Detail Error:</p>
                            <ul className="text-sm text-red-600 dark:text-red-400 space-y-1 max-h-40 overflow-y-auto">
                                {results.errors.map((err, i) => (
                                    <li key={i}>• {err}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    <Button onClick={() => setShowResultModal(false)} className="w-full">
                        Tutup
                    </Button>
                </div>
            </Modal>
        </div>
    )
}
