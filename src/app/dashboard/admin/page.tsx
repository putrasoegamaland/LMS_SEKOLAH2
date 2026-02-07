'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import Card from '@/components/ui/Card'
import StatsCard from '@/components/ui/StatsCard'
import { Calendar, School, BookOpen, UserCheck, Users, UserPlus, BarChart3, TrendingUp, GraduationCap, Megaphone } from 'lucide-react'

interface StatsData {
    totalTeachers: number
    totalStudents: number
    totalClasses: number
    totalSubjects: number
}

export default function AdminDashboard() {
    const { user } = useAuth()
    const router = useRouter()
    const [stats, setStats] = useState<StatsData>({
        totalTeachers: 0,
        totalStudents: 0,
        totalClasses: 0,
        totalSubjects: 0
    })

    useEffect(() => {
        if (user && user.role !== 'ADMIN') {
            router.replace('/dashboard')
        }
    }, [user, router])

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const [teachersRes, studentsRes, classesRes, subjectsRes] = await Promise.all([
                    fetch('/api/teachers'),
                    fetch('/api/students'),
                    fetch('/api/classes'),
                    fetch('/api/subjects')
                ])
                const [teachers, students, classes, subjects] = await Promise.all([
                    teachersRes.json(),
                    studentsRes.json(),
                    classesRes.json(),
                    subjectsRes.json()
                ])
                setStats({
                    totalTeachers: Array.isArray(teachers) ? teachers.length : 0,
                    totalStudents: Array.isArray(students) ? students.length : 0,
                    totalClasses: Array.isArray(classes) ? classes.length : 0,
                    totalSubjects: Array.isArray(subjects) ? subjects.length : 0
                })
            } catch (error) {
                console.error('Error fetching stats:', error)
            }
        }
        if (user) fetchStats()
    }, [user])

    const menuItems = [
        {
            title: 'Tahun Ajaran',
            description: 'Kelola tahun ajaran aktif',
            icon: Calendar,
            href: '/dashboard/admin/tahun-ajaran',
        },
        {
            title: 'Kelas',
            description: 'Kelola daftar kelas',
            icon: School,
            href: '/dashboard/admin/kelas',
        },
        {
            title: 'Kenaikan Kelas',
            description: 'Proses kenaikan kelas massal',
            icon: GraduationCap,
            href: '/dashboard/admin/kenaikan-kelas',
        },
        {
            title: 'Mata Pelajaran',
            description: 'Kelola daftar mapel',
            icon: BookOpen,
            href: '/dashboard/admin/mapel',
        },
        {
            title: 'Akun Guru',
            description: 'Kelola akun guru',
            icon: UserCheck,
            href: '/dashboard/admin/guru',
        },
        {
            title: 'Akun Siswa',
            description: 'Kelola akun siswa',
            icon: Users,
            href: '/dashboard/admin/siswa',
        },
        {
            title: 'Penugasan',
            description: 'Assign guru ke kelas',
            icon: UserPlus,
            href: '/dashboard/admin/penugasan',
        },
        {
            title: 'Rekap Nilai',
            description: 'Rekap nilai per kelas',
            icon: BarChart3,
            href: '/dashboard/admin/rekap-nilai',
        },
        {
            title: 'Analitik',
            description: 'Performa per mapel',
            icon: TrendingUp,
            href: '/dashboard/admin/analitik',
        },
        {
            title: 'Pengumuman',
            description: 'Kelola pengumuman',
            icon: Megaphone,
            href: '/dashboard/admin/pengumuman',
        }
    ]

    return (
        <div className="space-y-8">
            {/* Welcome Section */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-primary to-primary-dark p-8 shadow-xl shadow-primary/20">
                <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10"></div>
                <div className="absolute -right-20 -top-20 w-80 h-80 bg-white/10 rounded-full blur-3xl"></div>

                <div className="relative">
                    <h1 className="text-3xl font-bold text-white mb-2 leading-tight">
                        Selamat Datang Admin, {user?.full_name}! 👋
                    </h1>
                    <p className="text-blue-50/90 text-lg">
                        Panel Administrasi - Kelola seluruh data sekolah
                    </p>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                <StatsCard
                    label="Total Guru"
                    value={stats.totalTeachers}
                    icon={<UserCheck className="w-6 h-6 text-blue-500" />}
                />
                <StatsCard
                    label="Total Siswa"
                    value={stats.totalStudents}
                    icon={<Users className="w-6 h-6 text-green-500" />}
                />
                <StatsCard
                    label="Total Kelas"
                    value={stats.totalClasses}
                    icon={<School className="w-6 h-6 text-purple-500" />}
                />
                <StatsCard
                    label="Total Mapel"
                    value={stats.totalSubjects}
                    icon={<BookOpen className="w-6 h-6 text-amber-500" />}
                />
            </div>

            {/* Menu Grid */}
            <div>
                <h2 className="text-xl font-bold text-text-main dark:text-white mb-6">Menu Kelola</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {menuItems.map((item, i) => (
                        <Link
                            key={i}
                            href={item.href}
                        >
                            <Card className="h-full border-2 border-primary/30 hover:border-primary hover:shadow-lg hover:shadow-primary/10 active:scale-95 transition-all group cursor-pointer">
                                <div className="flex items-start gap-4">
                                    {/* Duotone Icon Container with unique colors per function */}
                                    <div className={`flex-shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-sm ${item.href.includes('tahun-ajaran') ? 'bg-indigo-100 dark:bg-indigo-900/30 group-hover:bg-indigo-600' :
                                        item.href.includes('/kelas') ? 'bg-cyan-100 dark:bg-cyan-900/30 group-hover:bg-cyan-600' :
                                            item.href.includes('mapel') ? 'bg-blue-100 dark:bg-blue-900/30 group-hover:bg-blue-600' :
                                                item.href.includes('/guru') ? 'bg-emerald-100 dark:bg-emerald-900/30 group-hover:bg-emerald-600' :
                                                    item.href.includes('siswa') ? 'bg-violet-100 dark:bg-violet-900/30 group-hover:bg-violet-600' :
                                                        item.href.includes('penugasan') ? 'bg-teal-100 dark:bg-teal-900/30 group-hover:bg-teal-600' :
                                                            item.href.includes('rekap-nilai') ? 'bg-green-100 dark:bg-green-900/30 group-hover:bg-green-600' :
                                                                'bg-orange-100 dark:bg-orange-900/30 group-hover:bg-orange-600'
                                        }`}>
                                        <item.icon className={`w-7 h-7 transition-colors ${item.href.includes('tahun-ajaran') ? 'text-indigo-600 dark:text-indigo-400 group-hover:text-white' :
                                            item.href.includes('/kelas') ? 'text-cyan-600 dark:text-cyan-400 group-hover:text-white' :
                                                item.href.includes('mapel') ? 'text-blue-600 dark:text-blue-400 group-hover:text-white' :
                                                    item.href.includes('/guru') ? 'text-emerald-600 dark:text-emerald-400 group-hover:text-white' :
                                                        item.href.includes('siswa') ? 'text-violet-600 dark:text-violet-400 group-hover:text-white' :
                                                            item.href.includes('penugasan') ? 'text-teal-600 dark:text-teal-400 group-hover:text-white' :
                                                                item.href.includes('rekap-nilai') ? 'text-green-600 dark:text-green-400 group-hover:text-white' :
                                                                    'text-orange-600 dark:text-orange-400 group-hover:text-white'
                                            }`} strokeWidth={2} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-lg font-bold text-text-main dark:text-white group-hover:text-primary transition-colors mb-1">
                                            {item.title}
                                        </h3>
                                        <p className="text-sm text-text-secondary dark:text-[#A8BC9F]">
                                            {item.description}
                                        </p>
                                    </div>
                                    <div className="self-center opacity-0 group-hover:opacity-100 transition-all transform translate-x-[-10px] group-hover:translate-x-0 text-primary">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                    </div>
                                </div>
                            </Card>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    )
}
