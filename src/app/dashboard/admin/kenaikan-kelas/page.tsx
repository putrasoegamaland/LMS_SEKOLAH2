'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { PageHeader, Modal, Button, EmptyState } from '@/components/ui'
import Card from '@/components/ui/Card'
import { AcademicYear, Class, SchoolLevel } from '@/lib/types'
import { ArrowRight, Users, CheckCircle, XCircle, AlertTriangle, Loader2, GraduationCap, ArrowUpRight } from 'lucide-react'

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

    // Results
    const [showResultModal, setShowResultModal] = useState(false)
    const [results, setResults] = useState<{ success: number; failed: number; errors: string[] }>({ success: 0, failed: 0, errors: [] })

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
                action
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

    const toggleGroup = (classId: string) => {
        const newSelected = new Set(selectedGroups)
        if (newSelected.has(classId)) {
            newSelected.delete(classId)
        } else {
            newSelected.add(classId)
        }
        setSelectedGroups(newSelected)
    }

    const selectAll = () => {
        if (selectedGroups.size === classGroups.length) {
            setSelectedGroups(new Set())
        } else {
            setSelectedGroups(new Set(classGroups.map(g => g.sourceClass.id)))
        }
    }

    const handleProcess = async () => {
        if (selectedGroups.size === 0) return

        setProcessing(true)
        const successIds: string[] = []
        const errors: string[] = []

        try {
            for (const group of classGroups) {
                if (!selectedGroups.has(group.sourceClass.id)) continue

                for (const student of group.students) {
                    try {
                        if (group.action === 'GRADUATE') {
                            // Graduate student
                            const res = await fetch(`/api/students/${student.id}`, {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ status: 'GRADUATED' })
                            })
                            if (res.ok) {
                                successIds.push(student.id)
                            } else {
                                errors.push(`Gagal memproses ${student.user.full_name}: ${(await res.json()).error}`)
                            }
                        } else if (group.action === 'TRANSITION') {
                            // Transition SMP to SMA
                            const res = await fetch(`/api/students/${student.id}`, {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    school_level: 'SMA',
                                    class_id: null
                                })
                            })
                            if (res.ok) {
                                successIds.push(student.id)
                            } else {
                                errors.push(`Gagal memproses ${student.user.full_name}: ${(await res.json()).error}`)
                            }
                        } else if (group.targetClassId) {
                            // Promote to next class
                            const res = await fetch(`/api/students/${student.id}`, {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ class_id: group.targetClassId })
                            })
                            if (res.ok) {
                                successIds.push(student.id)
                            } else {
                                errors.push(`Gagal memproses ${student.user.full_name}: ${(await res.json()).error}`)
                            }
                        } else {
                            errors.push(`${student.user.full_name}: Target kelas belum tersedia`)
                        }
                    } catch (err) {
                        errors.push(`${student.user.full_name}: Error tidak terduga`)
                    }
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
        }
    }

    const getActionBadge = (action: 'PROMOTE' | 'GRADUATE' | 'TRANSITION') => {
        switch (action) {
            case 'PROMOTE':
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-full text-xs font-medium">
                        <ArrowUpRight className="w-3 h-3" />
                        Naik Kelas
                    </span>
                )
            case 'GRADUATE':
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-500/10 text-green-600 dark:text-green-400 rounded-full text-xs font-medium">
                        <GraduationCap className="w-3 h-3" />
                        Lulus
                    </span>
                )
            case 'TRANSITION':
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-full text-xs font-medium">
                        <ArrowRight className="w-3 h-3" />
                        Transisi SMA
                    </span>
                )
        }
    }

    const totalSelectedStudents = classGroups
        .filter(g => selectedGroups.has(g.sourceClass.id))
        .reduce((acc, g) => acc + g.students.length, 0)

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title="Kenaikan Kelas"
                subtitle="Proses kenaikan kelas, transisi, dan kelulusan siswa"
                backHref="/dashboard/admin"
                icon={<ArrowUpRight className="w-6 h-6 text-emerald-500" />}
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
                        icon={<AlertTriangle className="w-12 h-12 text-amber-500" />}
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
                        icon={<Users className="w-12 h-12 text-secondary" />}
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
                    {/* Selection Controls */}
                    <div className="flex items-center justify-between">
                        <Button variant="secondary" onClick={selectAll}>
                            {selectedGroups.size === classGroups.length ? 'Batalkan Semua' : 'Pilih Semua'}
                        </Button>
                        <div className="text-sm text-text-secondary">
                            {selectedGroups.size} kelas dipilih ({totalSelectedStudents} siswa)
                        </div>
                    </div>

                    {/* SMP Section */}
                    {classGroups.some(g => g.sourceClass.school_level === 'SMP') && (
                        <Card className="p-0 overflow-hidden">
                            <div className="bg-blue-500/10 px-6 py-3 border-b border-blue-500/20">
                                <h3 className="font-bold text-blue-600 dark:text-blue-400">🏫 SMP</h3>
                            </div>
                            <div className="divide-y divide-secondary/10">
                                {classGroups
                                    .filter(g => g.sourceClass.school_level === 'SMP')
                                    .map(group => (
                                        <div
                                            key={group.sourceClass.id}
                                            className={`p-4 flex items-center gap-4 cursor-pointer hover:bg-secondary/5 transition-colors ${selectedGroups.has(group.sourceClass.id) ? 'bg-primary/5' : ''
                                                }`}
                                            onClick={() => toggleGroup(group.sourceClass.id)}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={selectedGroups.has(group.sourceClass.id)}
                                                onChange={() => { }}
                                                className="w-5 h-5 rounded border-secondary text-primary focus:ring-primary/50 cursor-pointer"
                                            />
                                            <div className="flex-1 grid grid-cols-4 gap-4 items-center">
                                                <div>
                                                    <p className="font-bold text-text-main dark:text-white">{group.sourceClass.name}</p>
                                                    <p className="text-xs text-text-secondary">{group.students.length} siswa</p>
                                                </div>
                                                <div className="flex items-center gap-2 text-text-secondary">
                                                    <ArrowRight className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-text-main dark:text-white">{group.targetClassName}</p>
                                                </div>
                                                <div className="text-right">
                                                    {getActionBadge(group.action)}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        </Card>
                    )}

                    {/* SMA Section */}
                    {classGroups.some(g => g.sourceClass.school_level === 'SMA') && (
                        <Card className="p-0 overflow-hidden">
                            <div className="bg-purple-500/10 px-6 py-3 border-b border-purple-500/20">
                                <h3 className="font-bold text-purple-600 dark:text-purple-400">🎓 SMA</h3>
                            </div>
                            <div className="divide-y divide-secondary/10">
                                {classGroups
                                    .filter(g => g.sourceClass.school_level === 'SMA')
                                    .map(group => (
                                        <div
                                            key={group.sourceClass.id}
                                            className={`p-4 flex items-center gap-4 cursor-pointer hover:bg-secondary/5 transition-colors ${selectedGroups.has(group.sourceClass.id) ? 'bg-primary/5' : ''
                                                }`}
                                            onClick={() => toggleGroup(group.sourceClass.id)}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={selectedGroups.has(group.sourceClass.id)}
                                                onChange={() => { }}
                                                className="w-5 h-5 rounded border-secondary text-primary focus:ring-primary/50 cursor-pointer"
                                            />
                                            <div className="flex-1 grid grid-cols-4 gap-4 items-center">
                                                <div>
                                                    <p className="font-bold text-text-main dark:text-white">{group.sourceClass.name}</p>
                                                    <p className="text-xs text-text-secondary">{group.students.length} siswa</p>
                                                </div>
                                                <div className="flex items-center gap-2 text-text-secondary">
                                                    <ArrowRight className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-text-main dark:text-white">{group.targetClassName}</p>
                                                </div>
                                                <div className="text-right">
                                                    {getActionBadge(group.action)}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        </Card>
                    )}

                    {/* Process Button */}
                    <div className="flex justify-end">
                        <Button
                            onClick={handleProcess}
                            loading={processing}
                            disabled={selectedGroups.size === 0}
                            icon={<CheckCircle className="w-5 h-5" />}
                            className="px-8"
                        >
                            Proses Kenaikan Kelas ({totalSelectedStudents} siswa)
                        </Button>
                    </div>
                </>
            )}

            {/* Results Modal */}
            <Modal
                open={showResultModal}
                onClose={() => setShowResultModal(false)}
                title="📊 Hasil Proses Kenaikan Kelas"
            >
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4 rounded-xl text-center">
                            <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{results.success}</p>
                            <p className="text-sm text-green-700 dark:text-green-300">Berhasil</p>
                        </div>
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 rounded-xl text-center">
                            <XCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
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
