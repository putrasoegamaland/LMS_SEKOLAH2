'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { PageHeader, EmptyState, Button } from '@/components/ui'
import Card from '@/components/ui/Card'
import { Folder, Filter, ChevronRight } from 'react-iconly'
import { Loader2, FileDown, Search as SearchIcon, GraduationCap, Calendar, Users as UsersIcon, ChevronDown } from 'lucide-react'
import Papa from 'papaparse'

interface Alumni {
    id: string
    nis: string | null
    gender: 'L' | 'P' | null
    angkatan: string | null
    school_level: 'SMP' | 'SMA' | null
    user: {
        id: string
        username: string
        full_name: string | null
    }
    graduation_info: {
        ended_at: string | null
        notes: string | null
        class: {
            id: string
            name: string
            grade_level: number
            school_level: string
        } | null
        academic_year: {
            id: string
            name: string
        } | null
    } | null
}

interface ClassGroup {
    className: string
    schoolLevel: string
    gradeLevel: number
    students: Alumni[]
}

interface YearGroup {
    yearName: string
    yearId: string
    classes: ClassGroup[]
    totalStudents: number
}

export default function AlumniPage() {
    const [alumnis, setAlumnis] = useState<Alumni[]>([])
    const [loading, setLoading] = useState(true)

    // Filter states
    const [searchQuery, setSearchQuery] = useState('')
    const [debouncedSearch, setDebouncedSearch] = useState('')
    const [filterJenjang, setFilterJenjang] = useState('')
    const [filterAngkatan, setFilterAngkatan] = useState('')
    const [showFilters, setShowFilters] = useState(false)

    // Accordion states
    const [expandedYears, setExpandedYears] = useState<Set<string>>(new Set())
    const [expandedClasses, setExpandedClasses] = useState<Set<string>>(new Set())

    // Debounce search (400ms)
    const debounceRef = useRef<NodeJS.Timeout | null>(null)
    const handleSearchChange = useCallback((value: string) => {
        setSearchQuery(value)
        if (debounceRef.current) clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(() => {
            setDebouncedSearch(value)
        }, 400)
    }, [])

    const fetchData = useCallback(async () => {
        try {
            setLoading(true)
            const params = new URLSearchParams()
            if (debouncedSearch) params.set('search', debouncedSearch)
            if (filterJenjang) params.set('school_level', filterJenjang)
            if (filterAngkatan) params.set('angkatan', filterAngkatan)

            const res = await fetch(`/api/alumni?${params.toString()}`)
            const data = await res.json()
            setAlumnis(Array.isArray(data) ? data : [])
        } catch (error) {
            console.error('Error fetching alumni:', error)
        } finally {
            setLoading(false)
        }
    }, [debouncedSearch, filterJenjang, filterAngkatan])

    useEffect(() => {
        fetchData()
    }, [fetchData])

    // Group data: Year → Class → Students
    const yearGroups: YearGroup[] = (() => {
        const yearMap = new Map<string, { yearId: string; classMap: Map<string, ClassGroup> }>()

        for (const alumni of alumnis) {
            const yearName = alumni.graduation_info?.academic_year?.name || 'Tidak Diketahui'
            const yearId = alumni.graduation_info?.academic_year?.id || 'unknown'
            const className = alumni.graduation_info?.class?.name || 'Kelas Tidak Diketahui'
            const schoolLevel = alumni.graduation_info?.class?.school_level || alumni.school_level || '?'
            const gradeLevel = alumni.graduation_info?.class?.grade_level || 0

            if (!yearMap.has(yearName)) {
                yearMap.set(yearName, { yearId, classMap: new Map() })
            }

            const year = yearMap.get(yearName)!
            const classKey = `${className}_${schoolLevel}`

            if (!year.classMap.has(classKey)) {
                year.classMap.set(classKey, { className, schoolLevel, gradeLevel, students: [] })
            }

            year.classMap.get(classKey)!.students.push(alumni)
        }

        return Array.from(yearMap.entries())
            .map(([yearName, { yearId, classMap }]) => {
                const classes = Array.from(classMap.values()).sort((a, b) => {
                    const levelWeight: Record<string, number> = { 'SMP': 1, 'SMA': 2 }
                    const wA = levelWeight[a.schoolLevel] || 99
                    const wB = levelWeight[b.schoolLevel] || 99
                    if (wA !== wB) return wA - wB
                    if (a.gradeLevel !== b.gradeLevel) return a.gradeLevel - b.gradeLevel
                    return a.className.localeCompare(b.className)
                })
                return {
                    yearName,
                    yearId,
                    classes,
                    totalStudents: classes.reduce((sum, c) => sum + c.students.length, 0)
                }
            })
            .sort((a, b) => b.yearName.localeCompare(a.yearName)) // newest first
    })()

    const clearFilters = () => {
        setFilterJenjang('')
        setFilterAngkatan('')
        setSearchQuery('')
        setDebouncedSearch('')
    }

    const toggleYear = (yearName: string) => {
        const next = new Set(expandedYears)
        if (next.has(yearName)) next.delete(yearName)
        else next.add(yearName)
        setExpandedYears(next)
    }

    const toggleClass = (key: string) => {
        const next = new Set(expandedClasses)
        if (next.has(key)) next.delete(key)
        else next.add(key)
        setExpandedClasses(next)
    }

    const expandAll = () => {
        if (expandedYears.size === yearGroups.length) {
            setExpandedYears(new Set())
            setExpandedClasses(new Set())
        } else {
            setExpandedYears(new Set(yearGroups.map(y => y.yearName)))
            const allClassKeys: string[] = []
            yearGroups.forEach(y => y.classes.forEach(c => allClassKeys.push(`${y.yearName}_${c.className}_${c.schoolLevel}`)))
            setExpandedClasses(new Set(allClassKeys))
        }
    }

    const downloadCSV = () => {
        const dataToExport = alumnis.map(a => ({
            'Nama Lengkap': a.user.full_name || '-',
            'NIS': a.nis || '-',
            'L/P': a.gender || '-',
            'Angkatan': a.angkatan || '-',
            'Jenjang': a.school_level || '-',
            'Kelas Terakhir': a.graduation_info?.class?.name || '-',
            'Tahun Ajaran Lulus': a.graduation_info?.academic_year?.name || '-',
            'Catatan': a.graduation_info?.notes || '-'
        }))

        const csv = Papa.unparse(dataToExport)
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
        const link = document.createElement('a')
        const url = URL.createObjectURL(blob)
        link.setAttribute('href', url)
        link.setAttribute('download', 'Data_Alumni.csv')
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    // Statistics
    const stats = {
        total: alumnis.length,
        smp: alumnis.filter(a => a.school_level === 'SMP').length,
        sma: alumnis.filter(a => a.school_level === 'SMA').length,
        male: alumnis.filter(a => a.gender === 'L').length,
        female: alumnis.filter(a => a.gender === 'P').length,
    }

    // Unique angkatan from data
    const uniqueAngkatan = [...new Set(alumnis.map(a => a.angkatan).filter(Boolean))].sort((a, b) => Number(b) - Number(a))

    return (
        <div className="space-y-6">
            <PageHeader
                title="Data Alumni"
                subtitle="Riwayat siswa yang telah lulus"
                backHref="/dashboard/admin"
                icon={<div className="text-emerald-500"><Folder set="bold" primaryColor="currentColor" size={24} /></div>}
                action={
                    <div className="flex flex-wrap gap-2 justify-end">
                        <Button
                            variant="secondary"
                            onClick={() => setShowFilters(!showFilters)}
                            icon={<Filter set="bold" primaryColor="currentColor" size={20} />}
                        >
                            Filter
                        </Button>
                        <Button
                            onClick={downloadCSV}
                            disabled={alumnis.length === 0}
                            icon={<FileDown className="w-5 h-5" />}
                        >
                            Export CSV
                        </Button>
                    </div>
                }
            />

            {/* Statistics Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="flex items-center gap-4 p-5 hover:scale-[1.02] transition-transform">
                    <div className="w-12 h-12 rounded-xl bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 flex items-center justify-center">
                        <GraduationCap className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-text-secondary">Total Alumni</p>
                        <p className="text-2xl font-bold text-text-main dark:text-white">{stats.total}</p>
                    </div>
                </Card>
                <Card className="flex items-center gap-4 p-5 hover:scale-[1.02] transition-transform">
                    <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                        <span className="font-bold text-lg">SMP</span>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-text-secondary">Lulusan SMP</p>
                        <p className="text-2xl font-bold text-text-main dark:text-white">{stats.smp}</p>
                    </div>
                </Card>
                <Card className="flex items-center gap-4 p-5 hover:scale-[1.02] transition-transform">
                    <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                        <span className="font-bold text-lg">SMA</span>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-text-secondary">Lulusan SMA</p>
                        <p className="text-2xl font-bold text-text-main dark:text-white">{stats.sma}</p>
                    </div>
                </Card>
                <Card className="flex items-center gap-4 p-5 hover:scale-[1.02] transition-transform">
                    <div className="w-12 h-12 rounded-xl bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                        <UsersIcon className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-text-secondary">Gender (L/P)</p>
                        <div className="flex items-end gap-1 text-2xl font-bold text-text-main dark:text-white">
                            {stats.male} <span className="text-sm font-normal text-text-secondary mx-1">/</span> {stats.female}
                        </div>
                    </div>
                </Card>
            </div>

            {/* Search Bar */}
            <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2">
                    <SearchIcon className="w-5 h-5 text-slate-400" />
                </div>
                <input
                    type="text"
                    placeholder="Cari berdasarkan nama, NIS..."
                    value={searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm shadow-sm"
                />
                {loading && debouncedSearch && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                        <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
                    </div>
                )}
            </div>

            {/* Filter Bar */}
            {showFilters && (
                <Card className="p-4">
                    <div className="flex flex-wrap items-center gap-4">
                        <div className="flex items-center gap-2">
                            <label className="text-sm font-medium text-text-main dark:text-white">Jenjang:</label>
                            <select
                                value={filterJenjang}
                                onChange={(e) => setFilterJenjang(e.target.value)}
                                className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            >
                                <option value="">Semua Jenjang</option>
                                <option value="SMP">SMP</option>
                                <option value="SMA">SMA</option>
                            </select>
                        </div>
                        <div className="flex items-center gap-2">
                            <label className="text-sm font-medium text-text-main dark:text-white">Angkatan:</label>
                            <select
                                value={filterAngkatan}
                                onChange={(e) => setFilterAngkatan(e.target.value)}
                                className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            >
                                <option value="">Semua Angkatan</option>
                                {uniqueAngkatan.map(a => (
                                    <option key={String(a)} value={String(a)}>{String(a)}</option>
                                ))}
                            </select>
                        </div>
                        {(filterJenjang || filterAngkatan) && (
                            <button onClick={clearFilters} className="text-sm text-primary hover:underline">
                                Reset Filter
                            </button>
                        )}
                        <div className="text-sm text-text-secondary ml-auto">
                            {alumnis.length} alumni ditemukan
                        </div>
                    </div>
                </Card>
            )}

            {/* Grouped Accordion View */}
            <div>
                <div className="flex justify-between items-center mb-4 px-1">
                    <div className="text-sm font-medium text-text-secondary">
                        Total: <span className="text-text-main dark:text-white font-bold">{alumnis.length}</span> Alumni
                        {yearGroups.length > 0 && <span className="ml-2">• {yearGroups.length} Tahun Ajaran</span>}
                    </div>
                    {yearGroups.length > 0 && (
                        <button onClick={expandAll} className="text-sm font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 transition-colors">
                            {expandedYears.size === yearGroups.length ? 'Tutup Semua' : 'Buka Semua'}
                        </button>
                    )}
                </div>

                {loading && alumnis.length === 0 ? (
                    <Card className="p-12 flex justify-center">
                        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
                    </Card>
                ) : alumnis.length === 0 ? (
                    <Card className="p-12">
                        <EmptyState
                            icon={<div className="text-emerald-200"><GraduationCap size={48} /></div>}
                            title="Tidak Ada Data Alumni"
                            description={debouncedSearch || filterJenjang || filterAngkatan
                                ? "Tidak ada alumni yang sesuai filter pencarian"
                                : "Belum ada siswa yang berstatus Lulus (GRADUATED)"}
                            action={
                                (debouncedSearch || filterJenjang || filterAngkatan) ? (
                                    <Button onClick={clearFilters}>Reset Filter</Button>
                                ) : undefined
                            }
                        />
                    </Card>
                ) : (
                    <div className="space-y-4">
                        {yearGroups.map((yearGroup) => {
                            const yearExpanded = expandedYears.has(yearGroup.yearName)
                            return (
                                <Card key={yearGroup.yearName} className="overflow-hidden p-0">
                                    {/* Year Header */}
                                    <button
                                        onClick={() => toggleYear(yearGroup.yearName)}
                                        className="w-full flex items-center justify-between p-4 bg-emerald-50/50 hover:bg-emerald-50 dark:bg-emerald-900/10 dark:hover:bg-emerald-900/20 transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="text-emerald-600 transition-transform duration-200" style={{ transform: yearExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>
                                                <ChevronRight set="bold" primaryColor="currentColor" size={20} />
                                            </div>
                                            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                                                <GraduationCap className="w-5 h-5" />
                                            </div>
                                            <div className="text-left">
                                                <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                                                    {yearGroup.yearName}
                                                </h3>
                                                <p className="text-xs text-slate-500">{yearGroup.classes.length} kelas</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="px-3 py-1.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full text-xs font-bold">
                                                {yearGroup.totalStudents} Alumni
                                            </span>
                                        </div>
                                    </button>

                                    {/* Classes inside this year */}
                                    {yearExpanded && (
                                        <div className="border-t border-emerald-100 dark:border-emerald-900/20">
                                            {yearGroup.classes.map((classGroup) => {
                                                const classKey = `${yearGroup.yearName}_${classGroup.className}_${classGroup.schoolLevel}`
                                                const classExpanded = expandedClasses.has(classKey)
                                                return (
                                                    <div key={classKey} className="border-b border-slate-100 dark:border-slate-800 last:border-b-0">
                                                        {/* Class Header */}
                                                        <button
                                                            onClick={() => toggleClass(classKey)}
                                                            className="w-full flex items-center justify-between px-6 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <div className="text-slate-400 transition-transform duration-200 ml-4" style={{ transform: classExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>
                                                                    <ChevronRight set="bold" primaryColor="currentColor" size={16} />
                                                                </div>
                                                                <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-sm border ${classGroup.schoolLevel === 'SMA'
                                                                        ? 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400'
                                                                        : 'bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400'
                                                                    }`}>
                                                                    {classGroup.schoolLevel}
                                                                </span>
                                                                <span className="font-semibold text-slate-700 dark:text-slate-200">{classGroup.className}</span>
                                                            </div>
                                                            <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full text-xs font-bold">
                                                                {classGroup.students.length} Siswa
                                                            </span>
                                                        </button>

                                                        {/* Students inside this class */}
                                                        {classExpanded && (
                                                            <div className="bg-slate-50/50 dark:bg-slate-900/20 border-t border-slate-100 dark:border-slate-800">
                                                                <table className="w-full">
                                                                    <thead className="bg-slate-100/60 dark:bg-slate-800/50">
                                                                        <tr>
                                                                            <th className="px-8 py-2.5 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">No</th>
                                                                            <th className="px-4 py-2.5 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Nama Lengkap</th>
                                                                            <th className="px-4 py-2.5 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">NIS</th>
                                                                            <th className="px-4 py-2.5 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">L/P</th>
                                                                            <th className="px-4 py-2.5 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Angkatan</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                                                        {classGroup.students.map((student, idx) => (
                                                                            <tr key={student.id} className="hover:bg-white dark:hover:bg-slate-800/40 transition-colors">
                                                                                <td className="px-8 py-2.5 text-xs text-slate-400 font-mono">{idx + 1}</td>
                                                                                <td className="px-4 py-2.5">
                                                                                    <div className="flex items-center gap-2.5">
                                                                                        <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-white font-bold text-[10px] shrink-0">
                                                                                            {student.user.full_name?.[0] || '?'}
                                                                                        </div>
                                                                                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                                                                                            {student.user.full_name || student.user.username}
                                                                                        </span>
                                                                                    </div>
                                                                                </td>
                                                                                <td className="px-4 py-2.5 text-xs text-slate-500 font-mono">{student.nis || '-'}</td>
                                                                                <td className="px-4 py-2.5">
                                                                                    {student.gender ? (
                                                                                        <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded border ${student.gender === 'L'
                                                                                                ? 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-900/20'
                                                                                                : 'bg-pink-50 text-pink-600 border-pink-200 dark:bg-pink-900/20'
                                                                                            }`}>
                                                                                            {student.gender}
                                                                                        </span>
                                                                                    ) : (
                                                                                        <span className="text-slate-400 text-xs">-</span>
                                                                                    )}
                                                                                </td>
                                                                                <td className="px-4 py-2.5 text-xs text-slate-500">{student.angkatan || '-'}</td>
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        )}
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    )}
                                </Card>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}
