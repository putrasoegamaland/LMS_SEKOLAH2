'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Modal, PageHeader, Button, EmptyState } from '@/components/ui'

interface TeachingAssignment {
    id: string
    subject: { id: string; name: string }
    class: { name: string }
}

interface Material {
    id: string
    title: string
    description: string | null
    type: string
    content_url: string | null
    content_text: string | null
    created_at: string
    teaching_assignment: TeachingAssignment
}

interface SubjectGroup {
    subjectId: string
    subjectName: string
    classes: string[]
    materials: Material[]
}

export default function MateriPage() {
    const { user } = useAuth()
    const [materials, setMaterials] = useState<Material[]>([])
    const [assignments, setAssignments] = useState<TeachingAssignment[]>([])
    const [groupedSubjects, setGroupedSubjects] = useState<SubjectGroup[]>([])
    const [selectedSubject, setSelectedSubject] = useState<SubjectGroup | null>(null)
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [formData, setFormData] = useState({
        teaching_assignment_id: '',
        title: '',
        description: '',
        type: 'TEXT',
        content_url: '',
        content_text: ''
    })
    const [saving, setSaving] = useState(false)
    const [file, setFile] = useState<File | null>(null)
    const [previewingPDF, setPreviewingPDF] = useState<string | null>(null)

    const fetchData = async () => {
        try {
            const teachersRes = await fetch('/api/teachers')
            const teachers = await teachersRes.json()
            const myTeacher = teachers.find((t: { user: { id: string } }) => t.user.id === user?.id)

            if (!myTeacher) {
                setLoading(false)
                return
            }

            const [assignmentsRes, materialsRes] = await Promise.all([
                fetch('/api/teaching-assignments'),
                fetch('/api/materials')
            ])
            const [assignmentsData, materialsData] = await Promise.all([
                assignmentsRes.json(),
                materialsRes.json()
            ])

            const myAssignments = assignmentsData.filter((a: { teacher: { id: string } }) => a.teacher.id === myTeacher.id)
            const myMaterials = materialsData.filter((m: Material) =>
                myAssignments.some((a: TeachingAssignment) => a.id === m.teaching_assignment?.id)
            )

            setAssignments(myAssignments)
            setMaterials(myMaterials)

            // Group materials by subject
            const groups: Record<string, SubjectGroup> = {}
            myAssignments.forEach((a: TeachingAssignment) => {
                const subjectId = a.subject.id
                if (!groups[subjectId]) {
                    groups[subjectId] = {
                        subjectId,
                        subjectName: a.subject.name,
                        classes: [],
                        materials: []
                    }
                }
                if (!groups[subjectId].classes.includes(a.class.name)) {
                    groups[subjectId].classes.push(a.class.name)
                }
            })

            // Add materials to groups
            myMaterials.forEach((m: Material) => {
                const subjectId = m.teaching_assignment?.subject?.id
                if (subjectId && groups[subjectId]) {
                    groups[subjectId].materials.push(m)
                }
            })

            setGroupedSubjects(Object.values(groups))
        } catch (error) {
            console.error('Error:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (user) fetchData()
    }, [user])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)
        try {
            let finalContentUrl = formData.content_url

            if (formData.type === 'PDF' && file) {
                const uploadFormData = new FormData()
                uploadFormData.append('file', file)

                const uploadRes = await fetch('/api/materials/upload', {
                    method: 'POST',
                    body: uploadFormData
                })

                if (!uploadRes.ok) {
                    const errorData = await uploadRes.json()
                    throw new Error(errorData.error || 'Gagal upload file')
                }

                const data = await uploadRes.json()
                finalContentUrl = data.url
            }

            const res = await fetch('/api/materials', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    content_url: finalContentUrl
                })
            })

            if (res.ok) {
                setShowModal(false)
                setFormData({ teaching_assignment_id: '', title: '', description: '', type: 'TEXT', content_url: '', content_text: '' })
                setFile(null)
                fetchData()
            }
        } catch (error: any) {
            console.error('Error uploading/saving:', error)
            alert(error.message || 'Gagal menyimpan materi. Pastikan file valid.')
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Yakin ingin menghapus materi ini?')) return
        await fetch(`/api/materials/${id}`, { method: 'DELETE' })
        fetchData()
    }

    const getTypeLabel = (type: string) => {
        switch (type) {
            case 'PDF': return '📄'
            case 'VIDEO': return '🎬'
            case 'TEXT': return '📝'
            case 'LINK': return '🔗'
            default: return '📚'
        }
    }

    // Open modal with pre-selected subject if viewing a subject
    const handleAddMaterial = () => {
        if (selectedSubject && assignments.length > 0) {
            // Find first teaching assignment for this subject
            const firstTA = assignments.find(a => a.subject.id === selectedSubject.subjectId)
            if (firstTA) {
                setFormData({ ...formData, teaching_assignment_id: firstTA.id })
            }
        }
        setShowModal(true)
    }

    // Filter subjects by search
    const filteredSubjects = groupedSubjects.filter(group =>
        group.subjectName.toLowerCase().includes(searchQuery.toLowerCase())
    )

    // View 1: Subject Cards
    if (!selectedSubject) {
        return (
            <div className="space-y-6">
                <PageHeader
                    title="📚 Materi Pembelajaran"
                    subtitle="Pilih mata pelajaran"
                    backHref="/dashboard/guru"
                    action={
                        <Button onClick={() => setShowModal(true)} icon={
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                        }>
                            Tambah Materi
                        </Button>
                    }
                />

                {/* Search Bar */}
                <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-xl p-6">
                    <label className="block text-sm font-medium text-slate-300 mb-3">🔍 Cari Mata Pelajaran</label>
                    <div className="relative">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Ketik nama mata pelajaran..."
                            className="w-full px-5 py-4 pl-12 bg-slate-700 border border-slate-600 rounded-xl text-white text-lg focus:outline-none focus:ring-2 focus:ring-green-500 placeholder-slate-500"
                        />
                        <svg className="w-6 h-6 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                </div>

                {loading ? (
                    <div className="text-center text-slate-400 py-8">Memuat...</div>
                ) : filteredSubjects.length === 0 ? (
                    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-8 text-center">
                        <p className="text-slate-400 text-lg">
                            {searchQuery ? '🔍 Tidak ada mata pelajaran yang cocok' : '📚 Belum ada mata pelajaran'}
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {filteredSubjects.map((group) => (
                            <button
                                key={group.subjectId}
                                onClick={() => { setSelectedSubject(group); setSearchQuery('') }}
                                className="group bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 hover:border-green-500/50 hover:bg-slate-800 transition-all text-left"
                            >
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center text-white mb-4 shadow-lg shadow-green-500/20 group-hover:scale-110 transition-transform">
                                    <span className="text-2xl">📚</span>
                                </div>
                                <h3 className="text-lg font-bold text-white mb-1 group-hover:text-green-400 transition-colors">
                                    {group.subjectName}
                                </h3>
                                <p className="text-sm text-slate-400 mb-1">
                                    {group.materials.length} Materi
                                </p>
                                <div className="flex flex-wrap gap-1 mt-2">
                                    {group.classes.map((className, idx) => (
                                        <span key={idx} className="px-2 py-0.5 bg-green-500/20 text-green-400 rounded text-xs">
                                            {className}
                                        </span>
                                    ))}
                                </div>
                            </button>
                        ))}
                    </div>
                )}

                {/* Add Material Modal */}
                <Modal open={showModal} onClose={() => setShowModal(false)} title="Tambah Materi">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Kelas & Mata Pelajaran</label>
                            <select
                                value={formData.teaching_assignment_id}
                                onChange={(e) => setFormData({ ...formData, teaching_assignment_id: e.target.value })}
                                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                                required
                            >
                                <option value="">Pilih Kelas & Mapel</option>
                                {assignments.map((a) => (
                                    <option key={a.id} value={a.id}>{a.class.name} - {a.subject.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Judul Materi</label>
                            <input
                                type="text"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Deskripsi</label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                                rows={2}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Tipe</label>
                            <select
                                value={formData.type}
                                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                            >
                                <option value="TEXT">Teks</option>
                                <option value="LINK">Link URL</option>
                                <option value="PDF">Upload PDF</option>
                                <option value="VIDEO">Video URL</option>
                            </select>
                        </div>

                        {formData.type === 'PDF' ? (
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">File PDF</label>
                                <input
                                    type="file"
                                    accept="application/pdf"
                                    onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
                                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-slate-300 focus:outline-none focus:ring-2 focus:ring-green-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-slate-600 file:text-white hover:file:bg-slate-500"
                                    required
                                />
                                <p className="mt-1 text-xs text-slate-500">Maksimal 5MB.</p>
                            </div>
                        ) : formData.type === 'TEXT' ? (
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Konten</label>
                                <textarea
                                    value={formData.content_text}
                                    onChange={(e) => setFormData({ ...formData, content_text: e.target.value })}
                                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                                    rows={4}
                                />
                            </div>
                        ) : (
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">URL</label>
                                <input
                                    type="url"
                                    value={formData.content_url}
                                    onChange={(e) => setFormData({ ...formData, content_url: e.target.value })}
                                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                                    placeholder="https://..."
                                />
                            </div>
                        )}

                        <div className="flex gap-3 pt-4">
                            <Button type="button" variant="secondary" onClick={() => setShowModal(false)} className="flex-1">
                                Batal
                            </Button>
                            <Button type="submit" loading={saving} className="flex-1">
                                Simpan
                            </Button>
                        </div>
                    </form>
                </Modal>

                {/* PDF Preview Modal */}
                {previewingPDF && (
                    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setPreviewingPDF(null)}>
                        <div className="bg-slate-900 rounded-xl w-full max-w-6xl h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                            {/* Header */}
                            <div className="flex items-center justify-between p-4 border-b border-slate-700">
                                <h3 className="text-lg font-semibold text-white">📄 Preview PDF</h3>
                                <div className="flex gap-2">
                                    <a
                                        href={previewingPDF}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors text-sm font-medium"
                                    >
                                        📥 Download
                                    </a>
                                    <button
                                        onClick={() => setPreviewingPDF(null)}
                                        className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                                    >
                                        ✕ Tutup
                                    </button>
                                </div>
                            </div>
                            {/* PDF Viewer */}
                            <div className="flex-1 overflow-hidden">
                                <iframe
                                    src={previewingPDF}
                                    className="w-full h-full"
                                    title="PDF Preview"
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>
        )
    }

    // View 2: Materials List for Selected Subject
    return (
        <div className="space-y-6">
            {/* Header with back button on left */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setSelectedSubject(null)}
                        className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-white">{selectedSubject.subjectName}</h1>
                        <p className="text-slate-400">{selectedSubject.materials.length} Materi</p>
                    </div>
                </div>
                <Button onClick={handleAddMaterial} icon={
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                }>
                    Tambah Materi
                </Button>
            </div>

            {selectedSubject.materials.length === 0 ? (
                <EmptyState
                    icon="📚"
                    title="Belum Ada Materi"
                    description={`Belum ada materi untuk ${selectedSubject.subjectName}`}
                    action={<Button onClick={handleAddMaterial}>Tambah Materi</Button>}
                />
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedSubject.materials.map((material) => (
                        <div key={material.id} className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 hover:border-green-500/50 transition-all">
                            <div className="flex items-start gap-3">
                                <span className="text-2xl">{getTypeLabel(material.type)}</span>
                                <div className="flex-1">
                                    <h3 className="font-semibold text-white mb-1">{material.title}</h3>
                                    <p className="text-sm text-slate-400 mb-2">{material.description || '-'}</p>
                                    <div className="flex items-center gap-2 text-xs mb-3">
                                        <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded">
                                            {material.teaching_assignment?.class?.name}
                                        </span>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex flex-wrap gap-2">
                                        {material.type === 'PDF' && material.content_url && (
                                            <>
                                                <button
                                                    onClick={() => setPreviewingPDF(material.content_url)}
                                                    className="text-sm text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-1"
                                                >
                                                    👁️ Preview
                                                </button>
                                                <a
                                                    href={material.content_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-sm text-green-400 hover:text-green-300 transition-colors flex items-center gap-1"
                                                >
                                                    📥 Download
                                                </a>
                                            </>
                                        )}
                                        {material.content_url && material.type !== 'PDF' && material.type !== 'TEXT' && (
                                            <a
                                                href={material.content_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-sm text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
                                            >
                                                🔗 Buka Link
                                            </a>
                                        )}
                                        <button
                                            onClick={() => handleDelete(material.id)}
                                            className="text-sm text-red-400 hover:text-red-300 transition-colors flex items-center gap-1"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                            Hapus
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
