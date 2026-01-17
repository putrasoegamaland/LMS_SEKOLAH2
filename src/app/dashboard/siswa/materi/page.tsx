'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Modal, PageHeader, EmptyState } from '@/components/ui'

interface Material {
    id: string
    title: string
    description: string | null
    type: string
    content_url: string | null
    content_text: string | null
    created_at: string
    teaching_assignment: {
        subject: { name: string }
        class: { name: string }
    }
}

interface SubjectGroup {
    subjectName: string
    materials: Material[]
}

export default function SiswaMateriPage() {
    const { user } = useAuth()
    const [groupedMaterials, setGroupedMaterials] = useState<SubjectGroup[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedSubject, setSelectedSubject] = useState<SubjectGroup | null>(null)
    const [viewingMaterial, setViewingMaterial] = useState<Material | null>(null)
    const [searchQuery, setSearchQuery] = useState('')
    const [previewingPDF, setPreviewingPDF] = useState<string | null>(null)

    useEffect(() => {
        const fetchData = async () => {
            try {
                const studentsRes = await fetch('/api/students')
                const students = await studentsRes.json()
                const myStudent = students.find((s: { user: { id: string } }) => s.user.id === user?.id)

                if (!myStudent?.class_id) {
                    setLoading(false)
                    return
                }

                const materialsRes = await fetch('/api/materials')
                const materialsData = await materialsRes.json()

                const classMaterials = materialsData.filter((m: Material) =>
                    m.teaching_assignment?.class?.name === myStudent.class.name
                )

                const groups: Record<string, Material[]> = {}
                classMaterials.forEach((m: Material) => {
                    const subjectName = m.teaching_assignment?.subject?.name || 'Lainnya'
                    if (!groups[subjectName]) {
                        groups[subjectName] = []
                    }
                    groups[subjectName].push(m)
                })

                const groupList = Object.entries(groups).map(([subjectName, materials]) => ({
                    subjectName,
                    materials
                }))

                setGroupedMaterials(groupList)
            } catch (error) {
                console.error('Error:', error)
            } finally {
                setLoading(false)
            }
        }
        if (user) fetchData()
    }, [user])

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'PDF': return '📄'
            case 'VIDEO': return '🎬'
            case 'TEXT': return '📝'
            case 'LINK': return '🔗'
            default: return '📚'
        }
    }

    // Filter subjects by search query
    const filteredSubjects = groupedMaterials.filter(group =>
        group.subjectName.toLowerCase().includes(searchQuery.toLowerCase())
    )

    if (loading) {
        return <div className="text-center text-slate-400 py-8">Memuat materi...</div>
    }

    // View 1: Subject List (Default)
    if (!selectedSubject) {
        return (
            <div className="space-y-6">
                <PageHeader
                    title="📚 Materi Pembelajaran"
                    subtitle="Pilih mata pelajaran"
                    backHref="/dashboard/siswa"
                />

                {/* Search Bar */}
                <div className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/30 rounded-xl p-6">
                    <label className="block text-sm font-medium text-slate-300 mb-3">🔍 Cari Mata Pelajaran</label>
                    <div className="relative">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Ketik nama mata pelajaran..."
                            className="w-full px-5 py-4 pl-12 bg-slate-700 border border-slate-600 rounded-xl text-white text-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 placeholder-slate-500"
                        />
                        <svg className="w-6 h-6 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                </div>

                {filteredSubjects.length === 0 ? (
                    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-8 text-center">
                        <p className="text-slate-400 text-lg">
                            {searchQuery ? '🔍 Tidak ada mata pelajaran yang cocok' : '📚 Belum ada materi tersedia'}
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {filteredSubjects.map((group) => (
                            <button
                                key={group.subjectName}
                                onClick={() => { setSelectedSubject(group); setSearchQuery('') }}
                                className="group bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 hover:border-cyan-500/50 hover:bg-slate-800 transition-all text-left"
                            >
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-white mb-4 shadow-lg shadow-cyan-500/20 group-hover:scale-110 transition-transform">
                                    <span className="text-2xl">📚</span>
                                </div>
                                <h3 className="text-lg font-bold text-white mb-1 group-hover:text-cyan-400 transition-colors">
                                    {group.subjectName}
                                </h3>
                                <p className="text-sm text-slate-400">
                                    {group.materials.length} Materi Tersedia
                                </p>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        )
    }

    // View 2: Material List for Selected Subject
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
                        <p className="text-slate-400">Daftar Materi</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {selectedSubject.materials.map((material) => (
                    <div key={material.id} className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 hover:border-blue-500/50 transition-all">
                        <div className="flex items-start gap-3">
                            <span className="text-2xl">{getTypeIcon(material.type)}</span>
                            <div className="flex-1">
                                <h3 className="font-semibold text-white">{material.title}</h3>
                                <p className="text-sm text-slate-400 mb-2">{material.description || '-'}</p>

                                {material.type === 'TEXT' ? (
                                    <button
                                        onClick={() => setViewingMaterial(material)}
                                        className="inline-flex items-center gap-2 text-sm text-cyan-400 hover:text-cyan-300 transition-colors font-medium"
                                    >
                                        Baca Materi →
                                    </button>
                                ) : material.type === 'PDF' && material.content_url ? (
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setPreviewingPDF(material.content_url)}
                                            className="inline-flex items-center gap-2 text-sm text-purple-400 hover:text-purple-300 transition-colors font-medium"
                                        >
                                            👁️ Preview PDF
                                        </button>
                                        <a
                                            href={material.content_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-2 text-sm text-red-400 hover:text-red-300 transition-colors font-medium"
                                        >
                                            📥 Download PDF
                                        </a>
                                    </div>
                                ) : material.content_url ? (
                                    <a
                                        href={material.content_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors font-medium"
                                    >
                                        Buka Link →
                                    </a>
                                ) : null}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Material Viewer Modal (Text) */}
            <Modal
                open={!!viewingMaterial}
                onClose={() => setViewingMaterial(null)}
                title={viewingMaterial?.title || ''}
                subtitle={viewingMaterial?.teaching_assignment?.subject?.name}
                maxWidth="2xl"
            >
                {viewingMaterial && (
                    <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-800 text-slate-300 leading-relaxed whitespace-pre-wrap">
                        {viewingMaterial.content_text}
                    </div>
                )}
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
                                    className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors text-sm font-medium"
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
