'use client'

import { useEffect, useState } from 'react'
import { Modal, Button, PageHeader, EmptyState } from '@/components/ui'
import Card from '@/components/ui/Card'
import { AssignmentWizard } from '@/components/AssignmentWizard'
import {
    BookOpen, UserPlus, Loader2, User, Trash2, Edit,
    AlertCircle, ChevronDown, ChevronUp, School, ChevronRight, X
} from 'lucide-react'
import { AcademicYear, Class, Subject } from '@/lib/types'

interface Teacher {
    id: string
    nip: string | null
    user: { id: string; username: string; full_name: string | null }
}

interface TeacherGrouped {
    teacher: {
        id: string
        nip: string | null
        name: string
    }
    subjects: Array<{
        subject: { id: string; name: string }
        classes: Array<{ id: string; name: string; school_level: string; grade_level: number }>
    }>
    total_classes: number
    assignment_ids: string[]
}

interface ExistingAssignment {
    teacher_id: string
    subject_id: string
    class_id: string
    teacher_name?: string
}

export default function PenugasanPage() {
    const [teacherGroups, setTeacherGroups] = useState<TeacherGrouped[]>([])
    const [teachers, setTeachers] = useState<Teacher[]>([])
    const [subjects, setSubjects] = useState<Subject[]>([])
    const [classes, setClasses] = useState<Class[]>([])
    const [academicYears, setAcademicYears] = useState<AcademicYear[]>([])
    const [selectedYearId, setSelectedYearId] = useState<string>('')
    const [loading, setLoading] = useState(true)
    const [showWizard, setShowWizard] = useState(false)
    const [editMode, setEditMode] = useState<{
        teacherId: string
        subjectId: string
        selectedClassIds: string[]
    } | undefined>(undefined)
    const [expandedTeachers, setExpandedTeachers] = useState<Set<string>>(new Set())
    const [deleting, setDeleting] = useState<string | null>(null)
    const [showUnassignedModal, setShowUnassignedModal] = useState(false)

    const fetchData = async () => {
        try {
            setLoading(true)
            const [teachersRes, subjectsRes, classesRes, yearsRes] = await Promise.all([
                fetch('/api/teachers'),
                fetch('/api/subjects'),
                fetch('/api/classes'),
                fetch('/api/academic-years')
            ])
            const [teachersData, subjectsData, classesData, yearsData] = await Promise.all([
                teachersRes.json(),
                subjectsRes.json(),
                classesRes.json(),
                yearsRes.json()
            ])
            setTeachers(teachersData)
            setSubjects(subjectsData)
            setClasses(classesData)
            setAcademicYears(yearsData)

            // Set default to active year
            const activeYear = yearsData.find((y: AcademicYear) => y.is_active)
            if (activeYear && !selectedYearId) {
                setSelectedYearId(activeYear.id)
            }
        } catch (error) {
            console.error('Error:', error)
        } finally {
            setLoading(false)
        }
    }

    const fetchAssignments = async () => {
        if (!selectedYearId) return
        try {
            const res = await fetch(`/api/teaching-assignments/by-teacher?academic_year_id=${selectedYearId}`)
            const data = await res.json()
            setTeacherGroups(data)
        } catch (error) {
            console.error('Error fetching assignments:', error)
        }
    }

    useEffect(() => { fetchData() }, [])
    useEffect(() => {
        if (selectedYearId) fetchAssignments()
    }, [selectedYearId])

    // Calculate stats
    const totalSlots = classes.length * subjects.length
    const assignedCount = teacherGroups.reduce((sum, g) => sum + g.total_classes, 0)
    const unassignedTeachers = teacherGroups.filter(g => g.total_classes === 0)

    // Build existing assignments for conflict detection
    const existingAssignments: ExistingAssignment[] = teacherGroups.flatMap(group =>
        group.subjects.flatMap(subj =>
            subj.classes.map(cls => ({
                teacher_id: group.teacher.id,
                subject_id: subj.subject.id,
                class_id: cls.id,
                teacher_name: group.teacher.name
            }))
        )
    )

    // Calculate unassigned class+subject slots
    const assignedSlots = new Set(
        existingAssignments.map(a => `${a.class_id}-${a.subject_id}`)
    )
    const unassignedSlots = classes.flatMap(cls =>
        subjects.map(subj => ({
            classId: cls.id,
            className: cls.name,
            schoolLevel: cls.school_level,
            subjectId: subj.id,
            subjectName: subj.name
        }))
    ).filter(slot => !assignedSlots.has(`${slot.classId}-${slot.subjectId}`))

    const toggleExpanded = (teacherId: string) => {
        const newExpanded = new Set(expandedTeachers)
        if (newExpanded.has(teacherId)) {
            newExpanded.delete(teacherId)
        } else {
            newExpanded.add(teacherId)
        }
        setExpandedTeachers(newExpanded)
    }

    const handleEdit = (teacherId: string, subjectId: string) => {
        const group = teacherGroups.find(g => g.teacher.id === teacherId)
        const subjectData = group?.subjects.find(s => s.subject.id === subjectId)
        if (subjectData) {
            setEditMode({
                teacherId,
                subjectId,
                selectedClassIds: subjectData.classes.map(c => c.id)
            })
            setShowWizard(true)
        }
    }

    const handleDeleteSubject = async (teacherId: string, subjectId: string) => {
        if (!confirm('Hapus semua penugasan untuk mapel ini?')) return
        setDeleting(`${teacherId}-${subjectId}`)
        try {
            await fetch('/api/teaching-assignments/bulk', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    teacher_id: teacherId,
                    subject_id: subjectId,
                    academic_year_id: selectedYearId
                })
            })
            fetchAssignments()
        } finally {
            setDeleting(null)
        }
    }

    const handleDeleteAll = async (teacherId: string) => {
        if (!confirm('Hapus SEMUA penugasan untuk guru ini?')) return
        setDeleting(teacherId)
        try {
            await fetch('/api/teaching-assignments/bulk', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    teacher_id: teacherId,
                    academic_year_id: selectedYearId
                })
            })
            fetchAssignments()
        } finally {
            setDeleting(null)
        }
    }

    const openAddNew = (preSelectedTeacherId?: string) => {
        if (preSelectedTeacherId) {
            // Pre-select teacher and skip to step 2
            setEditMode({
                teacherId: preSelectedTeacherId,
                subjectId: '',
                selectedClassIds: []
            })
        } else {
            setEditMode(undefined)
        }
        setShowWizard(true)
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title="Penugasan Mengajar"
                subtitle="Assign guru ke kelas dan mata pelajaran"
                backHref="/dashboard/admin"
                icon={<BookOpen className="w-6 h-6 text-teal-500" />}
                action={
                    <Button onClick={() => openAddNew()} icon={<UserPlus className="w-4 h-4" />}>
                        Tambah Penugasan
                    </Button>
                }
            />

            {/* Year Filter & Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Year Selector */}
                <Card className="p-4">
                    <label className="block text-sm font-bold text-text-main dark:text-white mb-2">
                        Tahun Ajaran
                    </label>
                    <div className="relative">
                        <select
                            value={selectedYearId}
                            onChange={(e) => setSelectedYearId(e.target.value)}
                            className="w-full px-4 py-2.5 bg-secondary/5 border border-secondary/20 rounded-xl text-text-main dark:text-white focus:outline-none focus:ring-2 focus:ring-primary appearance-none"
                        >
                            <option value="">Pilih Tahun</option>
                            {academicYears.map((y) => (
                                <option key={y.id} value={y.id}>
                                    {y.name} {y.is_active && '(Aktif)'}
                                </option>
                            ))}
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-text-secondary">▼</div>
                    </div>
                </Card>

                {/* Stats */}
                <Card className="p-4 bg-gradient-to-br from-blue-500/10 to-blue-600/5">
                    <div className="text-sm text-text-secondary dark:text-zinc-400">Total Guru</div>
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{teacherGroups.length}</div>
                </Card>

                <Card className="p-4 bg-gradient-to-br from-green-500/10 to-green-600/5">
                    <div className="text-sm text-text-secondary dark:text-zinc-400">Penugasan</div>
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">{assignedCount}</div>
                </Card>

                {/* Clickable Card - Unassigned Slots */}
                <button
                    onClick={() => setShowUnassignedModal(true)}
                    disabled={unassignedSlots.length === 0}
                    className="text-left p-4 bg-gradient-to-br from-red-500/10 to-red-600/5 rounded-2xl border border-red-500/20 hover:border-red-500/40 hover:shadow-lg hover:shadow-red-500/10 transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-sm text-text-secondary dark:text-zinc-400">Kelas Belum Ada Guru</div>
                            <div className="text-2xl font-bold text-red-600 dark:text-red-400">{unassignedSlots.length}</div>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center group-hover:bg-red-500/20 transition-colors">
                            <ChevronRight className="w-5 h-5 text-red-500 group-hover:translate-x-0.5 transition-transform" />
                        </div>
                    </div>
                    {unassignedSlots.length > 0 && (
                        <div className="text-xs text-red-500/70 mt-1">Klik untuk lihat detail →</div>
                    )}
                </button>
            </div>

            {/* Unassigned Slots Modal */}
            {showUnassignedModal && (
                <div className="fixed inset-0 bg-background-dark/80 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
                    <div className="bg-white dark:bg-surface-dark border border-secondary/20 dark:border-white/5 rounded-3xl p-6 w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col shadow-2xl">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h2 className="text-xl font-bold text-text-main dark:text-white">🚨 Kelas Belum Ada Guru</h2>
                                <p className="text-sm text-text-secondary dark:text-zinc-400">{unassignedSlots.length} slot kelas-mapel belum diassign</p>
                            </div>
                            <button
                                onClick={() => setShowUnassignedModal(false)}
                                className="p-2 rounded-full hover:bg-secondary/10 text-text-secondary hover:text-primary-dark transition-colors"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="overflow-y-auto flex-1 space-y-2">
                            {subjects.map(subject => {
                                const unassignedForSubject = unassignedSlots.filter(s => s.subjectId === subject.id)
                                if (unassignedForSubject.length === 0) return null

                                return (
                                    <div key={subject.id} className="bg-secondary/5 dark:bg-white/5 rounded-xl p-3">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="font-bold text-text-main dark:text-white flex items-center gap-2">
                                                <BookOpen className="w-4 h-4 text-primary" />
                                                {subject.name}
                                            </span>
                                            <span className="text-xs text-red-500 bg-red-500/10 px-2 py-0.5 rounded-full">
                                                {unassignedForSubject.length} kelas kosong
                                            </span>
                                        </div>
                                        <div className="flex flex-wrap gap-1.5">
                                            {unassignedForSubject.map(slot => (
                                                <span
                                                    key={`${slot.classId}-${slot.subjectId}`}
                                                    className={`px-2 py-1 rounded-lg text-xs font-medium ${slot.schoolLevel === 'SMP'
                                                        ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                                                        : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                                        }`}
                                                >
                                                    {slot.className}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>

                        <div className="pt-4 border-t border-secondary/10 mt-4">
                            <Button onClick={() => { setShowUnassignedModal(false); openAddNew() }} className="w-full">
                                <UserPlus className="w-4 h-4 mr-2" />
                                Mulai Assign Guru
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Teacher Cards */}
            <Card className="overflow-hidden p-0">
                {loading ? (
                    <div className="p-12 flex justify-center">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                ) : !selectedYearId ? (
                    <div className="p-6">
                        <EmptyState
                            icon={<BookOpen className="w-12 h-12 text-teal-200" />}
                            title="Pilih Tahun Ajaran"
                            description="Pilih tahun ajaran untuk melihat penugasan"
                        />
                    </div>
                ) : teacherGroups.length === 0 ? (
                    <div className="p-6">
                        <EmptyState
                            icon={<School className="w-12 h-12 text-teal-200" />}
                            title="Belum Ada Guru"
                            description="Tambahkan guru terlebih dahulu"
                        />
                    </div>
                ) : (
                    <div className="divide-y divide-secondary/10">
                        {teacherGroups.map((group) => {
                            const isExpanded = expandedTeachers.has(group.teacher.id)
                            const hasAssignments = group.total_classes > 0

                            return (
                                <div key={group.teacher.id} className="hover:bg-secondary/5 transition-colors">
                                    {/* Teacher Header */}
                                    <div className="flex items-center gap-4 p-4">
                                        <div
                                            onClick={() => hasAssignments && toggleExpanded(group.teacher.id)}
                                            className={`flex-1 flex items-center gap-4 ${hasAssignments ? 'cursor-pointer' : ''}`}
                                        >
                                            <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-white ${hasAssignments
                                                ? 'bg-gradient-to-r from-indigo-500 to-violet-500'
                                                : 'bg-amber-500'
                                                }`}>
                                                {group.teacher.name[0]?.toUpperCase() || <User className="w-5 h-5" />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="font-bold text-text-main dark:text-white">
                                                    {group.teacher.name}
                                                </div>
                                                <div className="text-sm text-text-secondary dark:text-zinc-400">
                                                    {hasAssignments ? (
                                                        <span>
                                                            {group.subjects.length} mapel • {group.total_classes} kelas
                                                        </span>
                                                    ) : (
                                                        <span className="text-amber-600 dark:text-amber-400">
                                                            ⚠️ Belum ada penugasan
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        {hasAssignments ? (
                                            <button
                                                onClick={() => toggleExpanded(group.teacher.id)}
                                                className="p-2.5 bg-primary/10 hover:bg-primary/20 rounded-xl transition-all"
                                            >
                                                {isExpanded
                                                    ? <ChevronUp className="w-5 h-5 text-primary" />
                                                    : <ChevronDown className="w-5 h-5 text-primary" />
                                                }
                                            </button>
                                        ) : (
                                            <Button size="sm" onClick={() => openAddNew(group.teacher.id)}>
                                                Assign
                                            </Button>
                                        )}
                                    </div>

                                    {/* Expanded Details */}
                                    {isExpanded && hasAssignments && (
                                        <div className="px-4 pb-4 space-y-3">
                                            {group.subjects.map((subj) => (
                                                <div
                                                    key={subj.subject.id}
                                                    className="bg-secondary/5 dark:bg-white/5 rounded-xl p-3"
                                                >
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className="px-3 py-1 bg-green-500/10 text-green-600 dark:text-green-400 rounded-full text-xs font-bold border border-green-500/20">
                                                            📖 {subj.subject.name}
                                                        </span>
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={() => handleEdit(group.teacher.id, subj.subject.id)}
                                                                className="p-2 rounded-lg bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 transition-colors"
                                                                title="Edit"
                                                            >
                                                                <Edit className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteSubject(group.teacher.id, subj.subject.id)}
                                                                disabled={deleting === `${group.teacher.id}-${subj.subject.id}`}
                                                                className="p-2 rounded-lg bg-red-500/10 text-red-600 hover:bg-red-500/20 transition-colors disabled:opacity-50"
                                                                title="Hapus"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {subj.classes.map((cls) => (
                                                            <span
                                                                key={cls.id}
                                                                className={`px-2 py-1 rounded-lg text-xs font-medium ${cls.school_level === 'SMP'
                                                                    ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                                                                    : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                                                    }`}
                                                            >
                                                                {cls.name}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}

                                            {/* Action Buttons */}
                                            <div className="flex justify-between items-center pt-3">
                                                <button
                                                    onClick={() => openAddNew(group.teacher.id)}
                                                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary to-teal-500 text-white rounded-xl shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 hover:scale-[1.02] transition-all font-bold text-sm"
                                                >
                                                    <BookOpen className="w-4 h-4" />
                                                    + Tambah Mapel Lain
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteAll(group.teacher.id)}
                                                    disabled={deleting === group.teacher.id}
                                                    className="flex items-center gap-2 px-3 py-1.5 text-sm text-red-600 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                    Hapus Semua
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                )}
            </Card>

            {/* Assignment Wizard */}
            <AssignmentWizard
                open={showWizard}
                onClose={() => {
                    setShowWizard(false)
                    setEditMode(undefined)
                }}
                onSuccess={fetchAssignments}
                teachers={teachers}
                subjects={subjects}
                classes={classes}
                existingAssignments={existingAssignments}
                academicYearId={selectedYearId}
                editMode={editMode}
            />
        </div>
    )
}
