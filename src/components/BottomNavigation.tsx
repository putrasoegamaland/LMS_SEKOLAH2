'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import {
    Home, BookOpen, PenTool, Brain, BarChart3, Clock, Users, UserCheck,
    School, Megaphone, LucideIcon, TrendingUp, BookMarked, Calendar,
    ClipboardList, GraduationCap
} from 'lucide-react'

interface NavItem {
    icon: LucideIcon
    label: string
    path: string
}

const siswaNav: NavItem[] = [
    { icon: Home, label: 'Home', path: '/dashboard/siswa' },
    { icon: BookOpen, label: 'Materi', path: '/dashboard/siswa/materi' },
    { icon: PenTool, label: 'Tugas', path: '/dashboard/siswa/tugas' },
    { icon: Brain, label: 'Kuis', path: '/dashboard/siswa/kuis' },
    { icon: BarChart3, label: 'Nilai', path: '/dashboard/siswa/nilai' },
]

const guruNav: NavItem[] = [
    { icon: Home, label: 'Home', path: '/dashboard/guru' },
    { icon: BookOpen, label: 'Materi', path: '/dashboard/guru/materi' },
    { icon: PenTool, label: 'Tugas', path: '/dashboard/guru/tugas' },
    { icon: Brain, label: 'Kuis', path: '/dashboard/guru/kuis' },
    { icon: Clock, label: 'Ulangan', path: '/dashboard/guru/ulangan' },
]

const adminNav: NavItem[] = [
    { icon: Home, label: 'Home', path: '/dashboard/admin' },
    { icon: Users, label: 'Siswa', path: '/dashboard/admin/siswa' },
    { icon: UserCheck, label: 'Guru', path: '/dashboard/admin/guru' },
    { icon: School, label: 'Kelas', path: '/dashboard/admin/kelas' },
    { icon: GraduationCap, label: 'Kenaikan', path: '/dashboard/admin/kenaikan-kelas' },
    { icon: BookMarked, label: 'Mapel', path: '/dashboard/admin/mapel' },
    { icon: Calendar, label: 'Tahun', path: '/dashboard/admin/tahun-ajaran' },
    { icon: BarChart3, label: 'Analitik', path: '/dashboard/admin/analitik' },
    { icon: ClipboardList, label: 'Penugasan', path: '/dashboard/admin/penugasan' },
    { icon: Megaphone, label: 'Info', path: '/dashboard/admin/pengumuman' },
]

export default function BottomNavigation() {
    const pathname = usePathname()
    const { user } = useAuth()

    if (!user) return null

    const getNavItems = (): NavItem[] => {
        switch (user.role) {
            case 'SISWA': return siswaNav
            case 'GURU': return guruNav
            case 'ADMIN': return adminNav
            default: return []
        }
    }

    const navItems = getNavItems()

    const isActive = (path: string) => {
        if (path === `/dashboard/${user.role.toLowerCase()}`) {
            return pathname === path
        }
        return pathname.startsWith(path)
    }

    return (
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50">
            {/* Stronger shadow and blur for elevation */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent pointer-events-none" style={{ height: '120px', bottom: 0 }} />

            <div className="relative bg-white/98 dark:bg-surface-dark/98 backdrop-blur-2xl border-t-2 border-primary/10 dark:border-primary/20 shadow-[0_-8px_32px_-8px_rgba(0,0,0,0.12)] dark:shadow-[0_-8px_32px_-8px_rgba(0,0,0,0.3)]">
                {/* Subtle gradient accent on top */}
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

                <div className="flex items-center justify-around h-[72px] px-2">
                    {navItems.map((item) => {
                        const active = isActive(item.path)
                        const IconComponent = item.icon

                        return (
                            <Link
                                key={item.path}
                                href={item.path}
                                className="relative flex flex-col items-center justify-center flex-1 h-full group"
                            >
                                {/* Active Background Pill with animation */}
                                {active && (
                                    <div className="absolute inset-x-2 top-2 bottom-2 bg-gradient-to-br from-primary/20 to-primary/10 dark:from-primary/25 dark:to-primary/15 rounded-2xl animate-in fade-in zoom-in-95 duration-200" />
                                )}

                                {/* Hover effect for inactive items */}
                                {!active && (
                                    <div className="absolute inset-x-2 top-2 bottom-2 bg-secondary/0 group-hover:bg-secondary/10 dark:group-hover:bg-white/5 rounded-2xl transition-all duration-200" />
                                )}

                                {/* Icon Container with stronger elevation */}
                                <div className={`relative z-10 flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-300 ${active
                                    ? 'bg-gradient-to-br from-primary to-primary-dark text-white shadow-lg shadow-primary/40 scale-110 -translate-y-1'
                                    : 'text-text-secondary group-hover:text-text-main dark:group-hover:text-white group-hover:scale-105 group-hover:-translate-y-0.5'
                                    }`}>
                                    <IconComponent
                                        className={`transition-all duration-300 ${active ? 'w-5 h-5' : 'w-5 h-5 group-hover:w-5.5 group-hover:h-5.5'}`}
                                        strokeWidth={active ? 2.5 : 2}
                                    />
                                </div>

                                {/* Label with better typography */}
                                <span className={`relative z-10 text-[10px] mt-1.5 transition-all duration-300 ${active
                                    ? 'font-bold text-primary scale-105'
                                    : 'font-medium text-text-secondary group-hover:text-text-main group-hover:scale-105'
                                    }`}>
                                    {item.label}
                                </span>

                                {/* Active indicator dot */}
                                {active && (
                                    <div className="absolute -bottom-1 w-1 h-1 rounded-full bg-primary animate-in fade-in zoom-in duration-200" />
                                )}
                            </Link>
                        )
                    })}
                </div>

                {/* Safe area padding for iPhone with stronger visual */}
                <div className="h-safe-area-inset-bottom bg-white/98 dark:bg-surface-dark/98" />
            </div>
        </nav>
    )
}
