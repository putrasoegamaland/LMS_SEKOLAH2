'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Modal, Button, EmptyState } from '@/components/ui'
import Card from '@/components/ui/Card'
import { Loader2 } from 'lucide-react'
import { Document, Video, Paper, Discovery, ArrowLeft, Search, Delete, Download } from 'react-iconly'


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
            case 'PDF': return Document
            case 'VIDEO': return Video
            case 'TEXT': return Paper
            case 'LINK': return Discovery
            default: return Document
        }
    }

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'PDF': return { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-600 dark:text-red-400' }
            case 'VIDEO': return { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-600 dark:text-purple-400' }
            case 'TEXT': return { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-600 dark:text-amber-400' }
            case 'LINK': return { bg: 'bg-cyan-100 dark:bg-cyan-900/30', text: 'text-cyan-600 dark:text-cyan-400' }
            default: return { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400' }
        }
    }

    // Filter subjects by search query
    const filteredSubjects = groupedMaterials.filter(group =>
        group.subjectName.toLowerCase().includes(searchQuery.toLowerCase())
    )

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <Loader2 className="w-8 h-8 text-primary animate-spin" strokeWidth={2} />
            </div>
        )
    }

    // View 1: Subject List (Default)
    if (!selectedSubject) {
        return (
            <div className="space-y-6">
                <div className="flex items-center gap-4">
                    <a href="/dashboard/siswa" className="p-3 rounded-xl bg-white dark:bg-surface-dark border border-secondary/20 hover:border-primary text-text-secondary hover:text-primary transition-all shadow-sm">
                        <ArrowLeft set="bold" primaryColor="currentColor" size={24} />
                    </a>
                    <div>
                        <div className="flex items-center gap-2">
                            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                <span className="text-blue-600 dark:text-blue-400"><Document set="bold" primaryColor="currentColor" size={24} /></span>
                            </div>
                            <h3 className="text-lg font-bold text-text-main dark:text-white">📄 Preview Document</h3>
                        </div>
                        <p className="text-text-secondary dark:text-[#A8BC9F] ml-12">Pilih mata pelajaran untuk melihat materi</p>
                    </div>
                </div>

                {/* Search Bar */}
                <Card className="p-6 bg-gradient-to-r from-secondary/10 to-primary/5 border-secondary/20">
                    <label className="block text-sm font-bold text-text-main dark:text-white mb-3">🔍 Cari Mata Pelajaran</label>
                    <div className="relative">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Ketik nama mata pelajaran (contoh: Biologi)..."
                            className="w-full px-5 py-4 pl-12 bg-white dark:bg-surface-dark border border-secondary/20 rounded-xl text-lg text-text-main dark:text-white focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
                        />
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary">
                            <Search set="light" primaryColor="currentColor" size={24} />
                        </div>
                    </div>
                </Card>

                {filteredSubjects.length === 0 ? (
                    <EmptyState
                        icon={<span className="text-secondary"><Search set="bold" primaryColor="currentColor" size={48} /></span>}
                        title="Tidak Ditemukan"
                        description={searchQuery ? 'Tidak ada mata pelajaran yang cocok dengan pencarian.' : 'Belum ada materi pelajaran yang tersedia untuk kelas Anda.'}
                    />
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredSubjects.map((group) => (
                            <Card
                                key={group.subjectName}
                                className="group cursor-pointer hover:border-primary/50 transition-all hover:scale-[1.02] hover:shadow-lg"
                            >
                                <div onClick={() => { setSelectedSubject(group); setSearchQuery('') }}>
                                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center text-white mb-4 shadow-lg shadow-primary/20 group-hover:scale-110 transition-transform">
                                        <Document set="bold" primaryColor="currentColor" size={32} />
                                    </div>
                                    <h3 className="text-xl font-bold text-text-main dark:text-white mb-2 group-hover:text-primary transition-colors">
                                        {group.subjectName}
                                    </h3>
                                    <p className="text-sm text-text-secondary dark:text-[#A8BC9F] flex items-center gap-2">
                                        <span className="bg-secondary/20 px-2 py-0.5 rounded-full text-xs font-semibold">
                                            {group.materials.length} File
                                        </span>
                                        Materi Tersedia
                                    </p>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        )
    }

    // Helper to get YouTube Embed URL
    const getYouTubeEmbedUrl = (url: string) => {
        try {
            if (!url) return null
            // Handle standard youtube.com/watch?v=ID
            let videoId = ''
            if (url.includes('youtube.com/watch')) {
                const urlParams = new URLSearchParams(new URL(url).search)
                videoId = urlParams.get('v') || ''
            } else if (url.includes('youtu.be/')) {
                // Handle youtu.be/ID
                videoId = url.split('youtu.be/')[1]?.split('?')[0] || ''
            } else if (url.includes('youtube.com/embed/')) {
                // Already an embed link
                return url
            }

            if (videoId) {
                return `https://www.youtube.com/embed/${videoId}`
            }
            return null
        } catch (e) {
            return null
        }
    }

    // View 2: Material List for Selected Subject
    return (
        <div className="space-y-6">
            {/* Header with back button on left */}
            <div className="flex items-center gap-4 bg-white dark:bg-surface-dark p-6 rounded-3xl shadow-soft">
                <button
                    onClick={() => setSelectedSubject(null)}
                    className="w-10 h-10 rounded-full bg-secondary/10 hover:bg-secondary/20 text-text-secondary dark:text-[#A8BC9F] flex items-center justify-center transition-colors scroll-smooth"
                >
                    <ArrowLeft set="bold" primaryColor="currentColor" size={24} />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-text-main dark:text-white leading-tight">{selectedSubject.subjectName}</h1>
                    <p className="text-text-secondary dark:text-[#A8BC9F] text-sm">Daftar Materi Pembelajaran</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {selectedSubject.materials.map((material) => (
                    <Card key={material.id} className="hover:shadow-lg transition-all border-l-4 border-l-transparent hover:border-l-primary">
                        <div className="flex items-start gap-4">
                            {(() => {
                                const IconComponent = getTypeIcon(material.type)
                                const colors = getTypeColor(material.type)
                                return (
                                    <div className={`w-12 h-12 rounded-2xl ${colors.bg} flex items-center justify-center flex-shrink-0`}>
                                        <span className={colors.text}><IconComponent set="bold" primaryColor="currentColor" size={24} /></span>
                                    </div>
                                )
                            })()}
                            <div className="flex-1 min-w-0">
                                <h3 className="text-lg font-bold text-text-main dark:text-white mb-1">{material.title}</h3>
                                <p className="text-sm text-text-secondary dark:text-[#A8BC9F] mb-4 line-clamp-2">{material.description || 'Tidak ada deskripsi'}</p>

                                {/* Video Player Embed */}
                                {material.type === 'VIDEO' && material.content_url && (
                                    <div className="mb-4 rounded-xl overflow-hidden bg-black/5 dark:bg-black/20 aspect-video relative group shadow-sm border border-secondary/10">
                                        {getYouTubeEmbedUrl(material.content_url) ? (
                                            <iframe
                                                src={getYouTubeEmbedUrl(material.content_url)!}
                                                className="w-full h-full"
                                                allowFullScreen
                                                title={material.title}
                                            />
                                        ) : (
                                            <video
                                                src={material.content_url}
                                                controls
                                                className="w-full h-full"
                                                preload="metadata"
                                            />
                                        )}
                                    </div>
                                )}

                                <div className="flex flex-wrap gap-2">
                                    {material.type === 'TEXT' ? (
                                        <Button
                                            size="sm"
                                            variant="secondary"
                                            onClick={() => setViewingMaterial(material)}
                                        >
                                            Baca Materi
                                        </Button>
                                    ) : material.type === 'PDF' && material.content_url ? (
                                        <>
                                            <Button
                                                size="sm"
                                                variant="secondary"
                                                onClick={() => setPreviewingPDF(material.content_url)}
                                            >
                                                Preview PDF
                                            </Button>

                                        </>
                                    ) : material.type !== 'VIDEO' && (
                                        <a
                                            href={material.content_url || '#'}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="px-4 py-2 rounded-full bg-secondary/10 text-primary font-semibold hover:bg-secondary/20 transition-colors text-sm inline-flex items-center gap-2"
                                        >
                                            🔗 Buka Link
                                        </a>
                                    )}
                                </div>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>

            {/* Read Text Material Modal */}
            <Modal
                open={!!viewingMaterial}
                onClose={() => setViewingMaterial(null)}
                title={viewingMaterial?.title || ''}
                maxWidth="2xl"
            >
                <div className="space-y-4">
                    <div className="bg-secondary/5 p-4 rounded-xl border border-secondary/20">
                        <p className="text-sm text-text-secondary dark:text-[#A8BC9F] italic">
                            {viewingMaterial?.description || 'Tidak ada deskripsi tambahan.'}
                        </p>
                    </div>
                    <div className="prose prose-slate dark:prose-invert max-w-none text-text-main dark:text-white leading-relaxed whitespace-pre-wrap">
                        {viewingMaterial?.content_text}
                    </div>
                    <div className="pt-4 flex justify-end">
                        <Button variant="secondary" onClick={() => setViewingMaterial(null)}>
                            Tutup
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* PDF Preview Modal */}
            {previewingPDF && (
                <div className="fixed inset-0 bg-background-dark/90 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setPreviewingPDF(null)}>
                    <div className="bg-white dark:bg-surface-dark rounded-3xl w-full max-w-6xl h-[90vh] flex flex-col shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-4 px-6 border-b border-secondary/20">
                            <h3 className="text-lg font-bold text-text-main dark:text-white">📄 Preview Document</h3>
                            <div className="flex gap-3">
                                <a
                                    href={previewingPDF}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-4 py-2 bg-primary/10 text-primary-dark rounded-full transition-colors text-sm font-bold hover:bg-primary hover:text-white flex items-center gap-2"
                                >
                                    <Download set="bold" primaryColor="currentColor" size={20} />
                                    Download
                                </a>
                                <button
                                    onClick={() => setPreviewingPDF(null)}
                                    className="w-8 h-8 rounded-full bg-secondary/10 flex items-center justify-center text-text-secondary hover:bg-red-100 hover:text-red-500 transition-colors"
                                >
                                    <Delete set="bold" primaryColor="currentColor" size={20} />
                                </button>
                            </div>
                        </div>
                        <div className="flex-1 overflow-hidden bg-slate-50">
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
