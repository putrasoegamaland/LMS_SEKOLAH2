'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import Card from '@/components/ui/Card'
import { Document as BookOpen, Edit as PenTool, TimeCircle as Clock, Discovery as Brain, Folder as Archive, Graph as BarChart3, ArrowRight, Home as School } from 'react-iconly'
import { Loader2 } from 'lucide-react'

interface TeachingAssignment {
    id: string
    subject: { name: string }
    class: { id: string; name: string }
    academic_year: { name: string; is_active: boolean }
}

export default function GuruDashboard() {
    const { user } = useAuth()
    const router = useRouter()
    const [assignments, setAssignments] = useState<TeachingAssignment[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (user && user.role !== 'GURU') {
            router.replace('/dashboard')
        }
    }, [user, router])

    useEffect(() => {
        const fetchAssignments = async () => {
            try {
                const res = await fetch('/api/my-teaching-assignments')
                const data = await res.json()
                if (Array.isArray(data)) {
                    setAssignments(data)
                } else {
                    setAssignments([])
                }
            } catch (error) {
                console.error('Error:', error)
            } finally {
                setLoading(false)
            }
        }
        if (user) fetchAssignments()
    }, [user])

    const quickLinks = [
        { href: '/dashboard/guru/materi', icon: BookOpen, label: 'Materi', sub: 'Upload bahan ajar' },
        { href: '/dashboard/guru/tugas', icon: PenTool, label: 'Tugas', sub: 'Buat tugas siswa' },
        { href: '/dashboard/guru/ulangan', icon: Clock, label: 'Ulangan', sub: 'Kunci tab & timer' },
        { href: '/dashboard/guru/kuis', icon: Brain, label: 'Kuis', sub: 'Review & latihan' },
        { href: '/dashboard/guru/bank-soal', icon: Archive, label: 'Bank Soal', sub: 'Simpan & pakai lagi' },
        { href: '/dashboard/guru/nilai', icon: BarChart3, label: 'Nilai', sub: 'Rekap penilaian' },
        { href: '/dashboard/guru/wali-kelas', icon: School, label: 'Wali Kelas', sub: 'Data siswa perwalian' },
    ]

    return (
        <div className="space-y-8">
            {/* Welcome */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-primary to-primary-dark p-8 shadow-xl shadow-primary/20">
                <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10"></div>
                <div className="absolute -right-20 -top-20 w-80 h-80 bg-white/10 rounded-full blur-3xl"></div>

                <div className="relative">
                    <h1 className="text-3xl font-bold text-white mb-2 leading-tight">
                        Selamat Datang, {user?.full_name || 'Bapak/Ibu Guru'}! 👋
                    </h1>
                    <p className="text-blue-50/90 text-lg">
                        Dashboard Guru - Kelola pembelajaran dengan mudah
                    </p>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
                {quickLinks.map((link) => (
                    <Link key={link.href} href={link.href}>
                        <Card className="h-full border-2 border-primary/30 hover:border-primary hover:shadow-lg hover:shadow-primary/10 active:scale-95 transition-all group bg-white dark:bg-surface-dark cursor-pointer p-3 sm:p-4">
                            <div className="flex flex-col items-center text-center gap-2 sm:gap-3">
                                {/* Duotone Icon Container */}
                                <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center transition-all duration-300 ${link.href.includes('materi') ? 'bg-blue-100 dark:bg-blue-900/30 group-hover:bg-blue-600 text-blue-600 dark:text-blue-400 group-hover:text-white' :
                                    link.href.includes('tugas') ? 'bg-amber-100 dark:bg-amber-900/30 group-hover:bg-amber-600 text-amber-600 dark:text-amber-400 group-hover:text-white' :
                                        link.href.includes('ulangan') ? 'bg-red-100 dark:bg-red-900/30 group-hover:bg-red-600 text-red-600 dark:text-red-400 group-hover:text-white' :
                                            link.href.includes('kuis') ? 'bg-purple-100 dark:bg-purple-900/30 group-hover:bg-purple-600 text-purple-600 dark:text-purple-400 group-hover:text-white' :
                                                link.href.includes('bank-soal') ? 'bg-slate-100 dark:bg-slate-900/30 group-hover:bg-slate-600 text-slate-600 dark:text-slate-400 group-hover:text-white' :
                                                    'bg-green-100 dark:bg-green-900/30 group-hover:bg-green-600 text-green-600 dark:text-green-400 group-hover:text-white'
                                    }`}>
                                    <link.icon set="bold" primaryColor="currentColor" size={24} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-text-main dark:text-white group-hover:text-primary transition-colors text-sm sm:text-base">{link.label}</h3>
                                    <p className="text-[10px] sm:text-xs text-text-secondary dark:text-[#A8BC9F] mt-0.5 sm:mt-1 line-clamp-1">{link.sub}</p>
                                </div>
                            </div>
                        </Card>
                    </Link>
                ))}
            </div>

            {/* Teaching Assignments */}
            <div>
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-text-main dark:text-white">Kelas yang Diampu</h2>
                    {!loading && assignments.length > 0 && (
                        <span className="bg-primary/10 text-primary-dark dark:text-primary px-3 py-1 rounded-full text-xs font-bold">
                            {assignments.length} Kelas
                        </span>
                    )}
                </div>

                {loading ? (
                    <div className="flex items-center justify-center h-40">
                        <div className="animate-spin text-primary"><Loader2 className="w-8 h-8" /></div>
                    </div>
                ) : assignments.length === 0 ? (
                    <Card className="text-center py-12 border-dashed">
                        <div className="text-secondary mb-3"><BookOpen set="bold" primaryColor="currentColor" size={48} /></div>
                        <h3 className="text-lg font-bold text-text-main dark:text-white">Belum Ada Penugasan</h3>
                        <p className="text-text-secondary dark:text-[#A8BC9F]">Hubungi Administrator untuk mendapatkan akses kelas.</p>
                    </Card>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
                        {assignments.map((assignment) => (
                            <Link key={assignment.id} href={`/dashboard/guru/kelas/${assignment.class.id}`}>
                                <Card className="h-full hover:border-primary transition-all cursor-pointer group hover:shadow-md p-4">
                                    <div className="flex items-start justify-between mb-3">
                                        {/* Compact Icon */}
                                        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20">
                                            <span className="text-lg font-bold text-primary">
                                                {assignment.subject.name.charAt(0)}
                                            </span>
                                        </div>
                                        {assignment.academic_year.is_active && (
                                            <span className="px-2 py-0.5 bg-green-500/10 text-green-600 dark:text-green-400 text-[10px] font-bold rounded-full border border-green-500/20">
                                                Aktif
                                            </span>
                                        )}
                                    </div>

                                    <div className="space-y-1.5">
                                        <h3 className="text-sm font-bold text-text-main dark:text-white group-hover:text-primary transition-colors line-clamp-1">
                                            {assignment.subject.name}
                                        </h3>
                                        <div className="px-2 py-0.5 bg-secondary/10 dark:bg-white/5 rounded inline-block">
                                            <p className="text-xs font-medium text-text-main dark:text-white">
                                                {assignment.class.name}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="pt-2.5 mt-2.5 border-t border-secondary/10 dark:border-white/5 flex items-center justify-between">
                                        <span className="text-[10px] text-text-secondary dark:text-zinc-500">
                                            {assignment.academic_year.name}
                                        </span>
                                        <span className="text-primary font-bold text-[10px] flex items-center gap-1 group-hover:gap-1.5 transition-all">
                                            Masuk
                                            <div className="text-primary"><ArrowRight set="bold" primaryColor="currentColor" size={12} /></div>
                                        </span>
                                    </div>
                                </Card>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
