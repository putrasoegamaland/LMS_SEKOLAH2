'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Modal, Button, PageHeader, EmptyState } from '@/components/ui'
import SmartText from '@/components/SmartText'
import Card from '@/components/ui/Card'
import RapihAIModal from '@/components/RapihAIModal'
import { Folder, Plus, Document, Delete, Edit, Discovery, Paper, ShieldDone, TickSquare, InfoCircle, CloseSquare, Download } from 'react-iconly'
import Link from 'next/link' // Keep this import as it's used later
import AIReviewPanel from '@/components/AIReviewPanel'

interface QuestionBankItem {
    id: string
    question_text: string
    question_type: 'ESSAY' | 'MULTIPLE_CHOICE'
    options: string[] | null
    correct_answer: string | null
    difficulty: 'EASY' | 'MEDIUM' | 'HARD'
    image_url?: string | null
    created_at: string
    subject: { id: string; name: string } | null
    status?: string
    teacher_hots_claim?: boolean
    ai_review?: any
}

interface Subject {
    id: string
    name: string
}

interface PassageQuestion {
    question_text: string
    question_type: 'ESSAY' | 'MULTIPLE_CHOICE'
    options: string[]
    correct_answer: string
    difficulty: 'EASY' | 'MEDIUM' | 'HARD'
}

interface Passage {
    id: string
    title: string | null
    passage_text: string
    subject: { id: string; name: string } | null
    questions: Array<{
        id: string
        question_text: string
        question_type: 'ESSAY' | 'MULTIPLE_CHOICE'
        options: string[] | null
        correct_answer: string | null
        difficulty: 'EASY' | 'MEDIUM' | 'HARD'
        order_in_passage: number
    }>
    created_at: string
}

export default function BankSoalPage() {
    const { user } = useAuth()
    const [questions, setQuestions] = useState<QuestionBankItem[]>([])
    const [subjects, setSubjects] = useState<Subject[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedSubject, setSelectedSubject] = useState('')
    const [selectedDifficulty, setSelectedDifficulty] = useState('')

    // Selection state for export
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
    const [showExportConfirm, setShowExportConfirm] = useState(false)

    // Modal & Form Control
    const [showAddModal, setShowAddModal] = useState(false)
    const [questionType, setQuestionType] = useState<'standalone' | 'passage'>('standalone')
    const [saving, setSaving] = useState(false)
    const [showRapihAI, setShowRapihAI] = useState(false)
    const [showAddDropdown, setShowAddDropdown] = useState(false)

    // Standalone Question Form
    const [questionForm, setQuestionForm] = useState({
        question_text: '',
        question_type: 'MULTIPLE_CHOICE' as 'ESSAY' | 'MULTIPLE_CHOICE',
        options: ['', '', '', ''],
        correct_answer: '',
        difficulty: 'MEDIUM' as 'EASY' | 'MEDIUM' | 'HARD',
        subject_id: '',
        image_url: '',
        teacher_hots_claim: false
    })
    const [uploading, setUploading] = useState(false)

    // Passage State
    const [passages, setPassages] = useState<Passage[]>([])
    const [passageForm, setPassageForm] = useState({
        title: '',
        passage_text: '',
        subject_id: '',
        questions: [{
            question_text: '',
            question_type: 'MULTIPLE_CHOICE' as 'ESSAY' | 'MULTIPLE_CHOICE',
            options: ['', '', '', ''],
            correct_answer: '',
            difficulty: 'MEDIUM' as 'EASY' | 'MEDIUM' | 'HARD'
        }] as PassageQuestion[]
    })

    // Edit Passage State
    const [editingPassageId, setEditingPassageId] = useState<string | null>(null)
    const [showEditPassageModal, setShowEditPassageModal] = useState(false)
    const [editPassageForm, setEditPassageForm] = useState({
        title: '',
        passage_text: '',
        subject_id: '',
        questions: [] as PassageQuestion[]
    })

    // Image upload handler
    const handleImageUpload = async (file: File): Promise<string | null> => {
        setUploading(true)
        try {
            const formData = new FormData()
            formData.append('file', file)
            const res = await fetch('/api/questions/upload-image', {
                method: 'POST',
                body: formData
            })
            const data = await res.json()
            if (res.ok) return data.url
            alert(data.error || 'Gagal upload gambar')
            return null
        } catch {
            alert('Gagal upload gambar')
            return null
        } finally {
            setUploading(false)
        }
    }

    useEffect(() => {
        if (user) fetchData()
    }, [user])

    const fetchData = async () => {
        try {
            const [questionsRes, passagesRes, subjectsRes] = await Promise.all([
                fetch('/api/question-bank'),
                fetch('/api/passages'),
                fetch('/api/subjects')
            ])
            const [questionsData, passagesData, subjectsData] = await Promise.all([
                questionsRes.json(),
                passagesRes.json(),
                subjectsRes.json()
            ])
            setQuestions(questionsData)
            setPassages(passagesData)
            setSubjects(subjectsData)
        } catch (error) {
            console.error('Error:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Hapus soal dari bank soal?')) return
        await fetch(`/api/question-bank?id=${id}`, { method: 'DELETE' })
        fetchData()
    }

    const handleSubmitStandalone = async () => {
        setSaving(true)
        try {
            await fetch('/api/question-bank', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(questionForm)
            })
            await fetchData()
            handleCloseModal()
        } catch (error) {
            console.error('Error:', error)
            alert('Gagal menyimpan soal')
        } finally {
            setSaving(false)
        }
    }

    const handleSubmitPassage = async () => {
        setSaving(true)
        try {
            await fetch('/api/passages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(passageForm)
            })
            await fetchData()
            handleCloseModal()
        } catch (error) {
            console.error('Error:', error)
            alert('Gagal menyimpan passage')
        } finally {
            setSaving(false)
        }
    }

    const handleCloseModal = () => {
        setShowAddModal(false)
        setQuestionType('standalone')
        setSaving(false)
        // Reset forms
        setQuestionForm({
            question_text: '',
            question_type: 'MULTIPLE_CHOICE',
            options: ['', '', '', ''],
            correct_answer: '',
            difficulty: 'MEDIUM',
            subject_id: '',
            image_url: '',
            teacher_hots_claim: false
        })
        setPassageForm({
            title: '',
            passage_text: '',
            subject_id: '',
            questions: [{
                question_text: '',
                question_type: 'MULTIPLE_CHOICE',
                options: ['', '', '', ''],
                correct_answer: '',
                difficulty: 'MEDIUM'
            }]
        })
    }

    const handleAddPassageQuestion = () => {
        setPassageForm({
            ...passageForm,
            questions: [...passageForm.questions, {
                question_text: '',
                question_type: 'MULTIPLE_CHOICE',
                options: ['', '', '', ''],
                correct_answer: '',
                difficulty: 'MEDIUM'
            }]
        })
    }

    const handleRemovePassageQuestion = (index: number) => {
        if (passageForm.questions.length > 1) {
            setPassageForm({
                ...passageForm,
                questions: passageForm.questions.filter((_, i) => i !== index)
            })
        }
    }

    // Edit Passage Handlers
    const handleEditPassage = (p: Passage) => {
        setEditingPassageId(p.id)
        setEditPassageForm({
            title: p.title || '',
            passage_text: p.passage_text,
            subject_id: p.subject?.id || '',
            questions: p.questions?.map(q => ({
                question_text: q.question_text,
                question_type: q.question_type,
                options: q.options || ['', '', '', ''],
                correct_answer: q.correct_answer || '',
                difficulty: q.difficulty
            })) || []
        })
        setShowEditPassageModal(true)
    }

    const handleSaveEditPassage = async () => {
        if (!editingPassageId) return
        setSaving(true)
        try {
            await fetch(`/api/passages?id=${editingPassageId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editPassageForm)
            })
            await fetchData()
            setShowEditPassageModal(false)
            setEditingPassageId(null)
        } catch (error) {
            console.error('Error:', error)
            alert('Gagal menyimpan perubahan')
        } finally {
            setSaving(false)
        }
    }

    const handleDeletePassage = async (id: string) => {
        if (!confirm('Hapus passage ini beserta semua soalnya?')) return
        try {
            await fetch(`/api/passages?id=${id}`, { method: 'DELETE' })
            await fetchData()
        } catch (error) {
            console.error('Error:', error)
            alert('Gagal menghapus passage')
        }
    }

    const handleAddEditPassageQuestion = () => {
        setEditPassageForm({
            ...editPassageForm,
            questions: [...editPassageForm.questions, {
                question_text: '',
                question_type: 'MULTIPLE_CHOICE',
                options: ['', '', '', ''],
                correct_answer: '',
                difficulty: 'MEDIUM'
            }]
        })
    }

    const handleRemoveEditPassageQuestion = (index: number) => {
        if (editPassageForm.questions.length > 1) {
            setEditPassageForm({
                ...editPassageForm,
                questions: editPassageForm.questions.filter((_, i) => i !== index)
            })
        }
    }

    // Edit Standalone Question Handlers
    const [showEditQuestionModal, setShowEditQuestionModal] = useState(false)
    const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null)
    const [editQuestionForm, setEditQuestionForm] = useState({
        question_text: '',
        question_type: 'MULTIPLE_CHOICE' as 'ESSAY' | 'MULTIPLE_CHOICE',
        options: ['', '', '', ''],
        correct_answer: '',
        difficulty: 'MEDIUM' as 'EASY' | 'MEDIUM' | 'HARD',
        subject_id: '',
        image_url: ''
    })

    const handleEditQuestion = (q: QuestionBankItem) => {
        setEditingQuestionId(q.id)
        setEditQuestionForm({
            question_text: q.question_text,
            question_type: q.question_type,
            options: q.options || ['', '', '', ''],
            correct_answer: q.correct_answer || '',
            difficulty: q.difficulty,
            subject_id: q.subject?.id || '',
            image_url: q.image_url || ''
        })
        setShowEditQuestionModal(true)
    }

    const handleSaveEditQuestion = async () => {
        if (!editingQuestionId) return
        setSaving(true)
        try {
            await fetch(`/api/question-bank?id=${editingQuestionId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editQuestionForm)
            })
            await fetchData()
            setShowEditQuestionModal(false)
            setEditingQuestionId(null)
        } catch (error) {
            console.error('Error:', error)
            alert('Gagal menyimpan perubahan')
        } finally {
            setSaving(false)
        }
    }

    const filteredQuestions = questions.filter((q) => {
        if (selectedSubject && q.subject?.id !== selectedSubject) return false
        if (selectedDifficulty && q.difficulty !== selectedDifficulty) return false
        return true
    })

    const getDifficultyBadge = (difficulty: string) => {
        switch (difficulty) {
            case 'EASY':
                return 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-200'
            case 'MEDIUM':
                return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200'
            case 'HARD':
                return 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-200'
            default:
                return 'bg-secondary/10 text-text-secondary border-secondary/20'
        }
    }

    const getDifficultyLabel = (difficulty: string) => {
        switch (difficulty) {
            case 'EASY': return 'Mudah'
            case 'MEDIUM': return 'Sedang'
            case 'HARD': return 'Sulit'
            default: return difficulty
        }
    }

    const getStatusBadge = (status?: string) => {
        switch (status) {
            case 'approved':
                return <span className="px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 font-medium flex items-center gap-1"><TickSquare set="bold" primaryColor="currentColor" size={12} /> Approved</span>
            case 'ai_reviewing':
                return <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 font-medium animate-pulse flex items-center gap-1"><Discovery set="bold" primaryColor="currentColor" size={12} /> AI Review...</span>
            case 'admin_review':
                return <span className="px-2 py-0.5 text-xs rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 font-medium flex items-center gap-1"><InfoCircle set="bold" primaryColor="currentColor" size={12} /> Perlu Review</span>
            case 'returned':
                return <span className="px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 font-medium flex items-center gap-1"><CloseSquare set="bold" primaryColor="currentColor" size={12} /> Dikembalikan</span>
            case 'draft':
                return <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 font-medium flex items-center gap-1"><Paper set="bold" primaryColor="currentColor" size={12} /> Draft</span>
            default:
                return null
        }
    }

    const handleExport = () => {
        const questionsToExport = filteredQuestions.filter(q => selectedIds.has(q.id))

        const htmlContent = `
            <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word'>
            <head><meta charset='utf-8'><title>Bank Soal</title></head>
            <body style="font-family: Arial, sans-serif;">
            <h1 style="text-align:center;">Bank Soal</h1>
            <p style="text-align:center; color:#666;">Total: ${questionsToExport.length} Soal</p>
            <hr/>
            ${questionsToExport.map((q, idx) => `
                <div style="margin-bottom: 24px; page-break-inside: avoid;">
                    <p style="margin-bottom: 8px;"><strong>${idx + 1}. ${q.question_text}</strong></p>
                    ${q.question_type === 'MULTIPLE_CHOICE' && q.options ? `
                        <ul style="list-style:none; padding-left:20px; margin:0;">
                            ${q.options.map((opt, optIdx) => `
                                <li style="margin-bottom: 4px; ${q.correct_answer === String.fromCharCode(65 + optIdx) ? 'font-weight:bold; color:green;' : ''}">
                                    ${String.fromCharCode(65 + optIdx)}. ${opt}
                                </li>
                            `).join('')}
                        </ul>
                    ` : ''}
                </div>
            `).join('')}
            </body>
            </html>
        `
        const blob = new Blob([htmlContent], { type: 'application/msword' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'Bank_Soal.doc'
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        setShowExportConfirm(false)
        setSelectedIds(new Set())
    }

    const toggleSelectAll = () => {
        if (selectedIds.size === filteredQuestions.length && filteredQuestions.length > 0) {
            setSelectedIds(new Set())
        } else {
            setSelectedIds(new Set(filteredQuestions.map(q => q.id)))
        }
    }

    // Rapih AI Save Handler - saves AI results directly to bank soal
    const handleSaveAIToBank = async (results: any[]) => {
        if (results.length === 0) return
        setSaving(true)
        try {
            // Separate passage questions from standalone questions
            const passageGroups = new Map<string, any[]>()
            const standaloneQuestions: any[] = []

            results.forEach(q => {
                if (q.passage_text) {
                    const key = q.passage_text
                    if (!passageGroups.has(key)) passageGroups.set(key, [])
                    passageGroups.get(key)!.push(q)
                } else {
                    standaloneQuestions.push(q)
                }
            })

            // Save standalone questions to question bank
            if (standaloneQuestions.length > 0) {
                await fetch('/api/question-bank', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(standaloneQuestions.map(q => ({
                        question_text: q.question_text,
                        question_type: q.question_type,
                        options: q.options || null,
                        correct_answer: q.correct_answer || null,
                        difficulty: q.difficulty || 'MEDIUM',
                        subject_id: selectedSubject || null
                    })))
                })
            }

            // Save passage-based questions as passages
            for (const [passageText, pQuestions] of passageGroups) {
                await fetch('/api/passages', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        title: passageText.substring(0, 50) + '...',
                        passage_text: passageText,
                        subject_id: selectedSubject || null,
                        questions: pQuestions.map(q => ({
                            question_text: q.question_text,
                            question_type: q.question_type,
                            options: q.options || null,
                            correct_answer: q.correct_answer || null,
                            difficulty: q.difficulty || 'MEDIUM'
                        }))
                    })
                })
            }

            await fetchData()
            setShowRapihAI(false)
            alert('Soal berhasil disimpan ke Bank Soal!')
        } catch (error) {
            console.error('Error saving AI results to bank:', error)
            alert('Gagal menyimpan soal ke Bank Soal')
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title="Bank Soal"
                subtitle="Kelola dan reuse soal-soal Anda"
                backHref="/dashboard/guru"
                icon={<Folder set="bold" primaryColor="currentColor" size={24} />}
                action={
                    <div className="flex items-center gap-3">
                        <div className="text-right hidden sm:block">
                            <p className="text-xl font-bold text-primary">{questions.length}</p>
                            <p className="text-xs text-text-secondary">Total Soal</p>
                        </div>
                        <div className="relative inline-block">
                            <button
                                className="flex items-center gap-2 px-5 py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 active:scale-95 transition-all shadow-md shadow-primary/20 cursor-pointer"
                            >
                                <Plus set="bold" primaryColor="currentColor" size={20} />
                                Tambah Soal
                            </button>
                            {showAddDropdown && (
                                <>
                                    <div className="fixed inset-0 z-40" onClick={() => setShowAddDropdown(false)} />
                                    <div className="absolute right-0 top-full mt-2 z-50 w-64 bg-white dark:bg-zinc-800 rounded-xl shadow-xl border border-gray-200 dark:border-zinc-700 py-2 animate-in fade-in slide-in-from-top-2 duration-200">
                                        <button
                                            onClick={() => {
                                                setShowAddModal(true)
                                                setShowAddDropdown(false)
                                            }}
                                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors cursor-pointer"
                                        >
                                            <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                                                <Edit set="bold" primaryColor="currentColor" size={20} />
                                            </div>
                                            <div className="text-left">
                                                <div className="text-sm font-semibold text-text-main dark:text-white">Manual</div>
                                                <div className="text-xs text-text-secondary">Ketik soal satu per satu</div>
                                            </div>
                                        </button>
                                        <button
                                            onClick={() => {
                                                setShowRapihAI(true)
                                                setShowAddDropdown(false)
                                            }}
                                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors cursor-pointer"
                                        >
                                            <div className="w-9 h-9 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
                                                <Discovery set="bold" primaryColor="currentColor" size={20} />
                                            </div>
                                            <div className="text-left">
                                                <div className="text-sm font-semibold text-text-main dark:text-white">Rapih AI</div>
                                                <div className="text-xs text-text-secondary">Rapikan, generate, atau upload soal</div>
                                            </div>
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                        <Button
                            onClick={() => setShowExportConfirm(true)}
                            disabled={selectedIds.size === 0}
                            className="disabled:opacity-50 disabled:cursor-not-allowed"
                            icon={<Download set="bold" primaryColor="currentColor" size={20} />}
                        >
                            Export ({selectedIds.size})
                        </Button>
                    </div>
                }
            />

            {/* Filters & Select All */}
            <div className="flex flex-col sm:flex-row gap-4 items-center bg-white dark:bg-surface-dark p-4 rounded-2xl shadow-sm border border-secondary/10">
                <select
                    value={selectedSubject}
                    onChange={(e) => setSelectedSubject(e.target.value)}
                    className="w-full sm:w-auto px-4 py-2.5 bg-secondary/5 border border-secondary/20 rounded-xl text-text-main dark:text-white focus:outline-none focus:ring-2 focus:ring-primary appearance-none cursor-pointer hover:bg-secondary/10 transition-colors"
                >
                    <option value="">Semua Mata Pelajaran</option>
                    {subjects.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                </select>
                <select
                    value={selectedDifficulty}
                    onChange={(e) => setSelectedDifficulty(e.target.value)}
                    className="w-full sm:w-auto px-4 py-2.5 bg-secondary/5 border border-secondary/20 rounded-xl text-text-main dark:text-white focus:outline-none focus:ring-2 focus:ring-primary appearance-none cursor-pointer hover:bg-secondary/10 transition-colors"
                >
                    <option value="">Semua Kesulitan</option>
                    <option value="EASY">Mudah</option>
                    <option value="MEDIUM">Sedang</option>
                    <option value="HARD">Sulit</option>
                </select>
                {filteredQuestions.length > 0 && (
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={toggleSelectAll}
                        className="w-full sm:w-auto"
                    >
                        {selectedIds.size === filteredQuestions.length && filteredQuestions.length > 0 ? 'Batal Pilih Semua' : 'Pilih Semua'}
                    </Button>
                )}
            </div>

            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="animate-spin text-3xl text-primary"><Discovery set="bold" primaryColor="currentColor" size={40} /></div>
                </div>
            ) : filteredQuestions.length === 0 && passages.length === 0 ? (
                <EmptyState
                    icon={<div className="text-secondary"><Folder set="bold" primaryColor="currentColor" size={48} /></div>}
                    title="Bank Soal Kosong"
                    description="Simpan soal ke bank soal saat membuat kuis dengan OCR atau AI Generate."
                    action={
                        <Link href="/dashboard/guru/kuis">
                            <Button>Buat Kuis dengan AI</Button>
                        </Link>
                    }
                />
            ) : (
                <div className="space-y-6">
                    {/* Passages Section */}
                    {passages.length > 0 && (
                        <div className="space-y-4">
                            <h3 className="text-lg font-bold text-text-main dark:text-white flex items-center gap-2">
                                <Document set="bold" primaryColor="currentColor" size={20} />
                                Soal dengan Bacaan ({passages.length})
                            </h3>
                            {passages.map((p) => (
                                <div key={p.id} className="border-2 border-teal-200 dark:border-teal-700 rounded-2xl overflow-hidden bg-teal-50/50 dark:bg-teal-900/20">
                                    <div className="p-4 bg-teal-100/50 dark:bg-teal-800/30 border-b border-teal-200 dark:border-teal-700">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h4 className="font-bold text-text-main dark:text-white flex items-center gap-2">
                                                    <Document set="bold" primaryColor="currentColor" size={16} /> {p.title || 'Bacaan Tanpa Judul'}
                                                </h4>
                                                <span className="text-xs text-teal-600 dark:text-teal-400">{p.questions?.length || 0} soal terkait</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {p.subject && (
                                                    <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-teal-500/20 text-teal-700 dark:text-teal-300">
                                                        {p.subject.name}
                                                    </span>
                                                )}
                                                <button
                                                    onClick={() => handleEditPassage(p)}
                                                    className="p-2 hover:bg-teal-200 dark:hover:bg-teal-700 rounded-lg transition-colors"
                                                    title="Edit passage"
                                                >
                                                    <Edit set="bold" primaryColor="currentColor" size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDeletePassage(p.id)}
                                                    className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                                                    title="Hapus passage"
                                                >
                                                    <Delete set="bold" primaryColor="currentColor" size={16} />
                                                </button>
                                            </div>
                                        </div>
                                        <p className="text-sm text-text-secondary dark:text-zinc-400 mt-2 line-clamp-3">{p.passage_text}</p>
                                    </div>
                                    {/* Questions inside passage */}
                                    {p.questions && p.questions.length > 0 && (
                                        <div className="p-4 space-y-3">
                                            {p.questions.map((q, idx) => (
                                                <div key={q.id} className="p-3 bg-white dark:bg-surface-dark rounded-xl border border-teal-200 dark:border-teal-700">
                                                    <div className="flex items-start gap-3">
                                                        <span className="w-6 h-6 rounded-full bg-teal-500 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                                                            {idx + 1}
                                                        </span>
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                                                                <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${q.question_type === 'MULTIPLE_CHOICE' ? 'bg-blue-500/20 text-blue-600' : 'bg-amber-500/20 text-amber-600'}`}>
                                                                    {q.question_type === 'MULTIPLE_CHOICE' ? 'PG' : 'Essay'}
                                                                </span>
                                                                <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${getDifficultyBadge(q.difficulty)}`}>
                                                                    {getDifficultyLabel(q.difficulty)}
                                                                </span>
                                                            </div>
                                                            <SmartText text={q.question_text} className="text-text-main dark:text-white text-sm" />
                                                            {q.question_type === 'MULTIPLE_CHOICE' && q.options && (
                                                                <div className="mt-2 grid grid-cols-2 gap-1 text-xs">
                                                                    {q.options.map((opt, optIdx) => (
                                                                        <div key={optIdx} className={`px-2 py-1 rounded ${q.correct_answer === String.fromCharCode(65 + optIdx) ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'text-text-secondary'}`}>
                                                                            {String.fromCharCode(65 + optIdx)}. {opt}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Standalone Questions Section */}
                    {filteredQuestions.length > 0 && (
                        <div className="space-y-4">
                            {passages.length > 0 && (
                                <h3 className="text-lg font-bold text-text-main dark:text-white flex items-center gap-2">
                                    <Paper set="bold" primaryColor="currentColor" size={20} /> Soal Biasa ({filteredQuestions.length})
                                </h3>
                            )}
                            <div className="grid grid-cols-1 gap-4">
                                {filteredQuestions.map((q, idx) => (
                                    <label
                                        key={q.id}
                                        className={`block bg-white dark:bg-surface-dark border rounded-2xl p-5 cursor-pointer transition-all hover:shadow-md ${selectedIds.has(q.id)
                                            ? 'border-primary bg-primary/5 dark:bg-primary/10'
                                            : 'border-transparent hover:border-primary/30'
                                            }`}
                                    >
                                        <div className="flex items-start gap-4">
                                            <div className="pt-1">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedIds.has(q.id)}
                                                    onChange={(e) => {
                                                        const newSet = new Set(selectedIds)
                                                        if (e.target.checked) {
                                                            newSet.add(q.id)
                                                        } else {
                                                            newSet.delete(q.id)
                                                        }
                                                        setSelectedIds(newSet)
                                                    }}
                                                    className="w-5 h-5 rounded-md border-secondary/30 text-primary focus:ring-primary bg-secondary/10"
                                                />
                                            </div>
                                            <div className="w-8 h-8 rounded-lg bg-secondary/10 text-primary flex items-center justify-center font-bold text-sm flex-shrink-0">
                                                {idx + 1}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-3 flex-wrap">
                                                    <span className={`px-2.5 py-1 text-xs font-bold rounded-full border ${q.question_type === 'MULTIPLE_CHOICE' ? 'bg-blue-500/10 text-blue-600 border-blue-200 dark:text-blue-400' : 'bg-orange-500/10 text-orange-600 border-orange-200 dark:text-orange-400'}`}>
                                                        {q.question_type === 'MULTIPLE_CHOICE' ? 'Pilihan Ganda' : 'Essay'}
                                                    </span>
                                                    <span className={`px-2.5 py-1 text-xs font-bold rounded-full border ${getDifficultyBadge(q.difficulty)}`}>
                                                        {getDifficultyLabel(q.difficulty)}
                                                    </span>
                                                    {q.subject && (
                                                        <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-secondary/10 text-text-secondary border border-secondary/20">
                                                            {q.subject.name}
                                                        </span>
                                                    )}
                                                    {getStatusBadge(q.status)}
                                                </div>
                                                <SmartText text={q.question_text} className="text-text-main dark:text-white mb-4 text-lg font-medium leading-relaxed" />
                                                {q.question_type === 'MULTIPLE_CHOICE' && q.options && (
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                                                        {q.options.map((opt, optIdx) => (
                                                            <div key={optIdx} className={`px-4 py-3 rounded-xl border flex items-center gap-3 ${q.correct_answer === String.fromCharCode(65 + optIdx) ? 'bg-green-500/5 border-green-200 text-green-700 dark:text-green-400 dark:border-green-500/20' : 'bg-secondary/5 border-transparent text-text-secondary'}`}>
                                                                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${q.correct_answer === String.fromCharCode(65 + optIdx) ? 'bg-green-500 text-white' : 'bg-secondary/20 text-text-secondary'}`}>
                                                                    {String.fromCharCode(65 + optIdx)}
                                                                </span>
                                                                {opt}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    variant="secondary"
                                                    size="sm"
                                                    onClick={(e: any) => { e.preventDefault(); handleEditQuestion(q) }}
                                                    className="text-blue-500 hover:text-blue-600 hover:bg-blue-50"
                                                >
                                                    <Edit set="bold" primaryColor="currentColor" size={16} />
                                                </Button>
                                                <Button
                                                    variant="secondary"
                                                    size="sm"
                                                    onClick={(e: any) => { e.preventDefault(); handleDelete(q.id) }}
                                                    className="text-red-500 hover:text-red-600 hover:bg-red-50"
                                                >
                                                    <Delete set="bold" primaryColor="currentColor" size={20} />
                                                </Button>
                                            </div>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Add Question Modal */}
            <Modal
                open={showAddModal}
                onClose={handleCloseModal}
                title="Tambah Soal"
                maxWidth="2xl"
            >
                <div className="space-y-5">
                    {/* Type Selection */}
                    <div className="grid grid-cols-2 gap-3">
                        <label className={`flex items-center gap-3 p-4 border-2 rounded-xl cursor-pointer transition-colors ${questionType === 'standalone' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-secondary/20 hover:border-blue-300'}`}>
                            <input
                                type="radio"
                                name="questionType"
                                value="standalone"
                                checked={questionType === 'standalone'}
                                onChange={() => setQuestionType('standalone')}
                                className="w-5 h-5"
                            />
                            <div>
                                <p className="font-bold text-text-main dark:text-white">📝 Soal Biasa</p>
                                <p className="text-xs text-text-secondary">Soal standalone</p>
                            </div>
                        </label>

                        <label className={`flex items-center gap-3 p-4 border-2 rounded-xl cursor-pointer transition-colors ${questionType === 'passage' ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20' : 'border-secondary/20 hover:border-teal-300'}`}>
                            <input
                                type="radio"
                                name="questionType"
                                value="passage"
                                checked={questionType === 'passage'}
                                onChange={() => setQuestionType('passage')}
                                className="w-5 h-5"
                            />
                            <div>
                                <p className="font-bold text-text-main dark:text-white">📖 Soal dengan Bacaan</p>
                                <p className="text-xs text-text-secondary">Passage + multiple soal</p>
                            </div>
                        </label>
                    </div>

                    {/* Image Upload */}
                    <div>
                        <label className="block text-sm font-bold text-text-main dark:text-white mb-1">Gambar Soal</label>
                        {questionForm.image_url ? (
                            <div className="relative inline-block">
                                <img src={questionForm.image_url} alt="Preview" className="max-h-40 rounded-xl border border-secondary/20" />
                                <button
                                    onClick={() => setQuestionForm({ ...questionForm, image_url: '' })}
                                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600"
                                >✕</button>
                            </div>
                        ) : (
                            <label className="flex items-center gap-2 px-4 py-3 bg-secondary/5 border-2 border-dashed border-secondary/30 rounded-xl cursor-pointer hover:border-primary/50 transition-colors">
                                <svg className="w-5 h-5 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <span className="text-sm text-text-secondary">{uploading ? 'Mengupload...' : 'Upload Gambar (maks 5MB)'}</span>
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    disabled={uploading}
                                    onChange={async (e) => {
                                        const file = e.target.files?.[0]
                                        if (file) {
                                            const url = await handleImageUpload(file)
                                            if (url) setQuestionForm({ ...questionForm, image_url: url })
                                        }
                                    }}
                                />
                            </label>
                        )}
                    </div>

                    {/* STANDALONE FORM */}
                    {questionType === 'standalone' && (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-text-main dark:text-white mb-2">Tipe Soal</label>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setQuestionForm({ ...questionForm, question_type: 'MULTIPLE_CHOICE', options: ['', '', '', ''], correct_answer: '' })}
                                        className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${questionForm.question_type === 'MULTIPLE_CHOICE' ? 'bg-blue-500 text-white' : 'bg-secondary/10 text-text-main hover:bg-secondary/20'}`}
                                    >
                                        Pilihan Ganda
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setQuestionForm({ ...questionForm, question_type: 'ESSAY', options: [], correct_answer: '' })}
                                        className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${questionForm.question_type === 'ESSAY' ? 'bg-amber-500 text-white' : 'bg-secondary/10 text-text-main hover:bg-secondary/20'}`}
                                    >
                                        Essay
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-text-main dark:text-white mb-2">Mata Pelajaran</label>
                                    <select
                                        value={questionForm.subject_id}
                                        onChange={(e) => setQuestionForm({ ...questionForm, subject_id: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-secondary/5 border border-secondary/20 rounded-xl text-text-main dark:text-white"
                                    >
                                        <option value="">Pilih Mapel</option>
                                        {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-text-main dark:text-white mb-2">Kesulitan</label>
                                    <select
                                        value={questionForm.difficulty}
                                        onChange={(e) => setQuestionForm({ ...questionForm, difficulty: e.target.value as any })}
                                        className="w-full px-4 py-2.5 bg-secondary/5 border border-secondary/20 rounded-xl text-text-main dark:text-white"
                                    >
                                        <option value="EASY">Mudah</option>
                                        <option value="MEDIUM">Sedang</option>
                                        <option value="HARD">Sulit</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-text-main dark:text-white mb-2">Pertanyaan *</label>
                                <textarea
                                    value={questionForm.question_text}
                                    onChange={(e) => setQuestionForm({ ...questionForm, question_text: e.target.value })}
                                    rows={3}
                                    placeholder="Tulis soal..."
                                    className="w-full px-4 py-3 bg-secondary/5 border border-secondary/20 rounded-xl text-text-main dark:text-white"
                                />
                            </div>

                            {questionForm.question_type === 'MULTIPLE_CHOICE' && (
                                <>
                                    <div className="grid grid-cols-2 gap-3">
                                        {['A', 'B', 'C', 'D'].map((letter, idx) => (
                                            <div key={letter}>
                                                <label className="block text-sm font-bold text-text-main dark:text-white mb-1">Opsi {letter}</label>
                                                <input
                                                    type="text"
                                                    value={questionForm.options[idx] || ''}
                                                    onChange={(e) => {
                                                        const newOptions = [...questionForm.options]
                                                        newOptions[idx] = e.target.value
                                                        setQuestionForm({ ...questionForm, options: newOptions })
                                                    }}
                                                    placeholder={`Opsi ${letter}`}
                                                    className="w-full px-3 py-2 bg-secondary/5 border border-secondary/20 rounded-lg text-text-main dark:text-white text-sm"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-text-main dark:text-white mb-2">Kunci Jawaban</label>
                                        <div className="flex gap-2">
                                            {['A', 'B', 'C', 'D'].map(letter => (
                                                <button
                                                    key={letter}
                                                    type="button"
                                                    onClick={() => setQuestionForm({ ...questionForm, correct_answer: letter })}
                                                    className={`w-12 h-12 rounded-lg font-bold transition-colors ${questionForm.correct_answer === letter ? 'bg-green-500 text-white' : 'bg-secondary/10 text-text-main hover:bg-secondary/20'}`}
                                                >
                                                    {letter}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* HOTS Claim Toggle */}
                            <div className="flex items-center gap-3 p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 rounded-xl">
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={questionForm.teacher_hots_claim}
                                        onChange={e => setQuestionForm({ ...questionForm, teacher_hots_claim: e.target.checked })}
                                        className="sr-only peer"
                                    />
                                    <div className="w-9 h-5 bg-gray-300 peer-focus:outline-none rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                                </label>
                                <div>
                                    <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">🧠 Klaim HOTS</p>
                                    <p className="text-xs text-emerald-600 dark:text-emerald-400">Tandai soal ini sebagai Higher-Order Thinking</p>
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <Button variant="secondary" onClick={handleCloseModal} className="flex-1">Batal</Button>
                                <Button
                                    onClick={handleSubmitStandalone}
                                    disabled={saving || !questionForm.question_text.trim()}
                                    loading={saving}
                                    className="flex-1"
                                >
                                    {saving ? 'Menyimpan...' : 'Tambah Soal'}
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* PASSAGE FORM */}
                    {questionType === 'passage' && (
                        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-text-main dark:text-white mb-2">Judul Bacaan (opsional)</label>
                                    <input
                                        type="text"
                                        value={passageForm.title}
                                        onChange={(e) => setPassageForm({ ...passageForm, title: e.target.value })}
                                        placeholder="Contoh: Dialog di Toko"
                                        className="w-full px-4 py-2.5 bg-secondary/5 border border-secondary/20 rounded-xl text-text-main dark:text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-text-main dark:text-white mb-2">Mata Pelajaran</label>
                                    <select
                                        value={passageForm.subject_id}
                                        onChange={(e) => setPassageForm({ ...passageForm, subject_id: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-secondary/5 border border-secondary/20 rounded-xl text-text-main dark:text-white"
                                    >
                                        <option value="">Pilih Mapel (opsional)</option>
                                        {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-text-main dark:text-white mb-2">Teks Bacaan *</label>
                                <textarea
                                    value={passageForm.passage_text}
                                    onChange={(e) => setPassageForm({ ...passageForm, passage_text: e.target.value })}
                                    rows={6}
                                    placeholder="Masukkan teks bacaan/dialog..."
                                    className="w-full px-4 py-3 bg-secondary/5 border border-secondary/20 rounded-xl text-text-main dark:text-white resize-none"
                                />
                            </div>

                            <div className="border-t pt-4">
                                <div className="flex items-center justify-between mb-3">
                                    <label className="text-sm font-bold text-text-main dark:text-white">Soal-Soal ({passageForm.questions.length})</label>
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        onClick={handleAddPassageQuestion}
                                        icon={<Plus set="bold" primaryColor="currentColor" size={16} />}
                                    >
                                        Tambah Soal
                                    </Button>
                                </div>

                                <div className="space-y-4">
                                    {passageForm.questions.map((pq, idx) => (
                                        <div key={idx} className="p-4 bg-secondary/5 rounded-xl border border-secondary/20">
                                            <div className="flex items-center justify-between mb-3">
                                                <span className="text-sm font-bold text-text-main dark:text-white">Soal {idx + 1}</span>
                                                {passageForm.questions.length > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemovePassageQuestion(idx)}
                                                        className="p-1 text-red-500 hover:bg-red-50 rounded"
                                                    >
                                                        <Delete set="bold" primaryColor="currentColor" size={16} />
                                                    </button>
                                                )}
                                            </div>

                                            <div className="grid grid-cols-2 gap-2 mb-3">
                                                <select
                                                    value={pq.question_type}
                                                    onChange={(e) => {
                                                        const newQuestions = [...passageForm.questions]
                                                        newQuestions[idx].question_type = e.target.value as any
                                                        setPassageForm({ ...passageForm, questions: newQuestions })
                                                    }}
                                                    className="px-3 py-2 bg-white dark:bg-surface-dark border border-secondary/20 rounded-lg text-sm"
                                                >
                                                    <option value="MULTIPLE_CHOICE">Pilihan Ganda</option>
                                                    <option value="ESSAY">Essay</option>
                                                </select>
                                                <select
                                                    value={pq.difficulty}
                                                    onChange={(e) => {
                                                        const newQuestions = [...passageForm.questions]
                                                        newQuestions[idx].difficulty = e.target.value as any
                                                        setPassageForm({ ...passageForm, questions: newQuestions })
                                                    }}
                                                    className="px-3 py-2 bg-white dark:bg-surface-dark border border-secondary/20 rounded-lg text-sm"
                                                >
                                                    <option value="EASY">Mudah</option>
                                                    <option value="MEDIUM">Sedang</option>
                                                    <option value="HARD">Sulit</option>
                                                </select>
                                            </div>

                                            <textarea
                                                value={pq.question_text}
                                                onChange={(e) => {
                                                    const newQuestions = [...passageForm.questions]
                                                    newQuestions[idx].question_text = e.target.value
                                                    setPassageForm({ ...passageForm, questions: newQuestions })
                                                }}
                                                rows={2}
                                                placeholder="Tulis pertanyaan..."
                                                className="w-full px-3 py-2 bg-white dark:bg-surface-dark border border-secondary/20 rounded-lg text-sm mb-3 resize-none"
                                            />

                                            {pq.question_type === 'MULTIPLE_CHOICE' && (
                                                <div className="grid grid-cols-2 gap-2">
                                                    {['A', 'B', 'C', 'D'].map((letter, optIdx) => (
                                                        <div key={letter} className="flex items-center gap-2">
                                                            <input
                                                                type="radio"
                                                                name={`correct-${idx}`}
                                                                checked={pq.correct_answer === letter}
                                                                onChange={() => {
                                                                    const newQuestions = [...passageForm.questions]
                                                                    newQuestions[idx].correct_answer = letter
                                                                    setPassageForm({ ...passageForm, questions: newQuestions })
                                                                }}
                                                                className="text-primary"
                                                            />
                                                            <input
                                                                type="text"
                                                                value={pq.options[optIdx] || ''}
                                                                onChange={(e) => {
                                                                    const newQuestions = [...passageForm.questions]
                                                                    const newOpts = [...pq.options]
                                                                    newOpts[optIdx] = e.target.value
                                                                    newQuestions[idx].options = newOpts
                                                                    setPassageForm({ ...passageForm, questions: newQuestions })
                                                                }}
                                                                placeholder={`Opsi ${letter}`}
                                                                className="flex-1 px-2 py-1.5 bg-white dark:bg-surface-dark border border-secondary/20 rounded text-sm"
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4 border-t">
                                <Button variant="secondary" onClick={handleCloseModal} className="flex-1">Batal</Button>
                                <Button
                                    onClick={handleSubmitPassage}
                                    disabled={saving || !passageForm.passage_text.trim()}
                                    loading={saving}
                                    className="flex-1 bg-teal-500 hover:bg-teal-600"
                                >
                                    {saving ? 'Menyimpan...' : 'Simpan Passage'}
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </Modal>

            {/* Export Confirmation Modal */}
            <Modal
                open={showExportConfirm}
                onClose={() => setShowExportConfirm(false)}
                title="Export ke Word"
                maxWidth="sm"
            >
                <div className="text-center py-4">
                    <div className="w-20 h-20 bg-blue-500/10 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                    </div>
                    <h3 className="text-xl font-bold text-text-main dark:text-white mb-2">Konfirmasi Export</h3>
                    <p className="text-text-secondary mb-8">
                        Kamu akan mengexport <span className="text-primary font-bold">{selectedIds.size} soal</span> terpilih ke dalam format Microsoft Word (.doc).
                    </p>
                    <div className="flex gap-3">
                        <Button variant="secondary" onClick={() => setShowExportConfirm(false)} className="flex-1">
                            Batal
                        </Button>
                        <Button onClick={handleExport} className="flex-1">
                            Ya, Export Sekarang
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Edit Question Modal */}
            <Modal
                open={showEditQuestionModal}
                onClose={() => setShowEditQuestionModal(false)}
                title="Edit Soal"
                maxWidth="xl"
            >
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-text-main dark:text-white mb-1">Tipe Soal</label>
                        <select
                            value={editQuestionForm.question_type}
                            onChange={(e) => setEditQuestionForm({ ...editQuestionForm, question_type: e.target.value as 'ESSAY' | 'MULTIPLE_CHOICE' })}
                            className="w-full p-3 border border-secondary/30 rounded-xl bg-secondary/10 text-text-main"
                        >
                            <option value="MULTIPLE_CHOICE">Pilihan Ganda</option>
                            <option value="ESSAY">Essay</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-text-main dark:text-white mb-1">Mata Pelajaran</label>
                        <select
                            value={editQuestionForm.subject_id}
                            onChange={(e) => setEditQuestionForm({ ...editQuestionForm, subject_id: e.target.value })}
                            className="w-full p-3 border border-secondary/30 rounded-xl bg-secondary/10 text-text-main"
                        >
                            <option value="">Pilih Mata Pelajaran</option>
                            {subjects.map((s) => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-text-main dark:text-white mb-1">Kesulitan</label>
                        <select
                            value={editQuestionForm.difficulty}
                            onChange={(e) => setEditQuestionForm({ ...editQuestionForm, difficulty: e.target.value as 'EASY' | 'MEDIUM' | 'HARD' })}
                            className="w-full p-3 border border-secondary/30 rounded-xl bg-secondary/10 text-text-main"
                        >
                            <option value="EASY">Mudah</option>
                            <option value="MEDIUM">Sedang</option>
                            <option value="HARD">Sulit</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-text-main dark:text-white mb-1">Pertanyaan</label>
                        <textarea
                            value={editQuestionForm.question_text}
                            onChange={(e) => setEditQuestionForm({ ...editQuestionForm, question_text: e.target.value })}
                            className="w-full p-3 border border-secondary/30 rounded-xl bg-secondary/10 text-text-main min-h-[100px]"
                            placeholder="Tulis pertanyaan..."
                        />
                    </div>
                    {editQuestionForm.question_type === 'MULTIPLE_CHOICE' && (
                        <div className="space-y-2">
                            <label className="block text-sm font-bold text-text-main dark:text-white">Pilihan Jawaban</label>
                            {editQuestionForm.options.map((opt, idx) => (
                                <div key={idx} className="flex items-center gap-2">
                                    <span className="w-8 h-8 rounded-full bg-secondary/20 flex items-center justify-center font-bold text-sm">
                                        {String.fromCharCode(65 + idx)}
                                    </span>
                                    <input
                                        type="text"
                                        value={opt}
                                        onChange={(e) => {
                                            const newOpts = [...editQuestionForm.options]
                                            newOpts[idx] = e.target.value
                                            setEditQuestionForm({ ...editQuestionForm, options: newOpts })
                                        }}
                                        className="flex-1 p-2 border border-secondary/30 rounded-lg bg-secondary/10"
                                        placeholder={`Pilihan ${String.fromCharCode(65 + idx)}`}
                                    />
                                    <input
                                        type="radio"
                                        name="editCorrectAnswer"
                                        checked={editQuestionForm.correct_answer === String.fromCharCode(65 + idx)}
                                        onChange={() => setEditQuestionForm({ ...editQuestionForm, correct_answer: String.fromCharCode(65 + idx) })}
                                        className="w-5 h-5"
                                    />
                                </div>
                            ))}
                        </div>
                    )}
                    <div className="flex gap-3 pt-4">
                        <Button variant="secondary" onClick={() => setShowEditQuestionModal(false)} className="flex-1">Batal</Button>
                        <Button onClick={handleSaveEditQuestion} disabled={saving} className="flex-1">
                            {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Edit Passage Modal */}
            <Modal
                open={showEditPassageModal}
                onClose={() => setShowEditPassageModal(false)}
                title="Edit Passage"
                maxWidth="2xl"
            >
                <div className="space-y-5 max-h-[70vh] overflow-y-auto">
                    <div>
                        <label className="block text-sm font-bold text-text-main dark:text-white mb-1">Judul Bacaan (Opsional)</label>
                        <input
                            type="text"
                            value={editPassageForm.title}
                            onChange={(e) => setEditPassageForm({ ...editPassageForm, title: e.target.value })}
                            className="w-full p-3 border border-secondary/30 rounded-xl bg-secondary/10 text-text-main"
                            placeholder="Contoh: Teks Narasi - Cerita Rakyat"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-text-main dark:text-white mb-1">Teks Bacaan *</label>
                        <textarea
                            value={editPassageForm.passage_text}
                            onChange={(e) => setEditPassageForm({ ...editPassageForm, passage_text: e.target.value })}
                            className="w-full p-3 border border-secondary/30 rounded-xl bg-secondary/10 text-text-main min-h-[150px]"
                            placeholder="Tulis atau paste teks bacaan di sini..."
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-text-main dark:text-white mb-1">Mata Pelajaran</label>
                        <select
                            value={editPassageForm.subject_id}
                            onChange={(e) => setEditPassageForm({ ...editPassageForm, subject_id: e.target.value })}
                            className="w-full p-3 border border-secondary/30 rounded-xl bg-secondary/10 text-text-main"
                        >
                            <option value="">Pilih Mata Pelajaran</option>
                            {subjects.map((s) => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Questions */}
                    <div className="border-t pt-4">
                        <div className="flex items-center justify-between mb-3">
                            <h4 className="font-bold text-text-main dark:text-white">Soal-soal ({editPassageForm.questions.length})</h4>
                            <Button variant="secondary" size="sm" onClick={handleAddEditPassageQuestion} icon={<Plus set="bold" primaryColor="currentColor" size={16} />}>
                                Tambah Soal
                            </Button>
                        </div>
                        <div className="space-y-4">
                            {editPassageForm.questions.map((q, idx) => (
                                <div key={idx} className="border border-secondary/20 rounded-xl p-4 bg-secondary/5">
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="font-bold text-sm">Soal #{idx + 1}</span>
                                        {editPassageForm.questions.length > 1 && (
                                            <button onClick={() => handleRemoveEditPassageQuestion(idx)} className="text-red-500 hover:text-red-600">
                                                <Delete set="bold" primaryColor="currentColor" size={16} />
                                            </button>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-2 gap-3 mb-3">
                                        <select
                                            value={q.question_type}
                                            onChange={(e) => {
                                                const newQs = [...editPassageForm.questions]
                                                newQs[idx].question_type = e.target.value as 'ESSAY' | 'MULTIPLE_CHOICE'
                                                setEditPassageForm({ ...editPassageForm, questions: newQs })
                                            }}
                                            className="p-2 border border-secondary/30 rounded-lg bg-secondary/10 text-sm"
                                        >
                                            <option value="MULTIPLE_CHOICE">Pilihan Ganda</option>
                                            <option value="ESSAY">Essay</option>
                                        </select>
                                        <select
                                            value={q.difficulty}
                                            onChange={(e) => {
                                                const newQs = [...editPassageForm.questions]
                                                newQs[idx].difficulty = e.target.value as 'EASY' | 'MEDIUM' | 'HARD'
                                                setEditPassageForm({ ...editPassageForm, questions: newQs })
                                            }}
                                            className="p-2 border border-secondary/30 rounded-lg bg-secondary/10 text-sm"
                                        >
                                            <option value="EASY">Mudah</option>
                                            <option value="MEDIUM">Sedang</option>
                                            <option value="HARD">Sulit</option>
                                        </select>
                                    </div>
                                    <textarea
                                        value={q.question_text}
                                        onChange={(e) => {
                                            const newQs = [...editPassageForm.questions]
                                            newQs[idx].question_text = e.target.value
                                            setEditPassageForm({ ...editPassageForm, questions: newQs })
                                        }}
                                        className="w-full p-2 border border-secondary/30 rounded-lg bg-secondary/10 mb-2 text-sm"
                                        placeholder="Pertanyaan..."
                                        rows={2}
                                    />
                                    {q.question_type === 'MULTIPLE_CHOICE' && (
                                        <div className="grid grid-cols-2 gap-2">
                                            {q.options.map((opt, optIdx) => (
                                                <div key={optIdx} className="flex items-center gap-1">
                                                    <input
                                                        type="radio"
                                                        name={`editPassageQ${idx}`}
                                                        checked={q.correct_answer === String.fromCharCode(65 + optIdx)}
                                                        onChange={() => {
                                                            const newQs = [...editPassageForm.questions]
                                                            newQs[idx].correct_answer = String.fromCharCode(65 + optIdx)
                                                            setEditPassageForm({ ...editPassageForm, questions: newQs })
                                                        }}
                                                        className="w-4 h-4"
                                                    />
                                                    <span className="text-xs font-bold">{String.fromCharCode(65 + optIdx)}.</span>
                                                    <input
                                                        type="text"
                                                        value={opt}
                                                        onChange={(e) => {
                                                            const newQs = [...editPassageForm.questions]
                                                            newQs[idx].options[optIdx] = e.target.value
                                                            setEditPassageForm({ ...editPassageForm, questions: newQs })
                                                        }}
                                                        className="flex-1 p-1 border border-secondary/30 rounded text-xs bg-white dark:bg-surface-dark"
                                                        placeholder={`Pilihan ${String.fromCharCode(65 + optIdx)}`}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex gap-3 pt-4 border-t">
                        <Button variant="secondary" onClick={() => setShowEditPassageModal(false)} className="flex-1">Batal</Button>
                        <Button onClick={handleSaveEditPassage} disabled={saving} className="flex-1">
                            {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Rapih AI Modal */}
            <RapihAIModal
                visible={showRapihAI}
                onClose={() => setShowRapihAI(false)}
                onSaveResults={handleSaveAIToBank}
                onSaveToBank={handleSaveAIToBank}
                saving={saving}
                targetLabel="Bank Soal"
            />
        </div>
    )
}
