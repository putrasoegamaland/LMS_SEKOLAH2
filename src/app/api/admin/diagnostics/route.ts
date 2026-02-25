import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/supabase'
import { validateSession } from '@/lib/auth'

export async function GET(request: NextRequest) {
    try {
        const token = request.cookies.get('session_token')?.value
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const user = await validateSession(token)
        if (!user || user.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        // Run all diagnostic checks in parallel
        const [
            usersResult,
            studentsResult,
            teachersResult,
            sessionsResult,
            orphanStudentsResult,
            orphanTeachersResult,
            emptyQuizzesResult,
            emptyExamsResult,
            ungradedSubmissionsResult,
            classesResult,
            noClassStudentsResult,
            academicYearsResult,
        ] = await Promise.all([
            // Total users by role
            supabase.from('users').select('id, role'),
            // Total students
            supabase.from('students').select('id, user_id, class_id, status'),
            // Total teachers
            supabase.from('teachers').select('id, user_id'),
            // Active sessions
            supabase.from('sessions').select('id, expires_at'),
            // Orphaned students (students without matching user)
            supabase.from('students').select('id, user_id, user:users!students_user_id_fkey(id)'),
            // Orphaned teachers (teachers without matching user)
            supabase.from('teachers').select('id, user_id, user:users(id)'),
            // Quizzes with no questions
            supabase.from('quizzes').select('id, title, quiz_questions(id)').eq('is_active', true),
            // Exams with no questions
            supabase.from('exams').select('id, title, exam_questions(id)').eq('is_active', true),
            // Ungraded submissions (tugas)
            supabase.from('student_submissions').select('id, graded_at').is('graded_at', null),
            // Classes
            supabase.from('classes').select('id, name'),
            // Students without class
            supabase.from('students').select('id').is('class_id', null).eq('status', 'ACTIVE'),
            // Academic years
            supabase.from('academic_years').select('id, year, is_active'),
        ])

        const now = new Date()
        const users = usersResult.data || []
        const sessions = sessionsResult.data || []
        const expiredSessions = sessions.filter(s => new Date(s.expires_at) < now)
        const activeSessions = sessions.filter(s => new Date(s.expires_at) >= now)

        // Count orphaned records
        const orphanStudents = (orphanStudentsResult.data || []).filter((s: any) => !s.user)
        const orphanTeachers = (orphanTeachersResult.data || []).filter((t: any) => !t.user)

        // Empty quizzes/exams (active but no questions)
        const emptyQuizzes = (emptyQuizzesResult.data || []).filter((q: any) => !q.quiz_questions || q.quiz_questions.length === 0)
        const emptyExams = (emptyExamsResult.data || []).filter((e: any) => !e.exam_questions || e.exam_questions.length === 0)

        // User stats
        const adminCount = users.filter(u => u.role === 'ADMIN').length
        const guruCount = users.filter(u => u.role === 'GURU').length
        const siswaCount = users.filter(u => u.role === 'SISWA').length
        const waliCount = users.filter(u => u.role === 'WALI').length
        const noRoleCount = users.filter(u => !u.role).length

        const diagnostics = {
            timestamp: now.toISOString(),
            status: 'ok' as string,
            checks: [
                {
                    id: 'db_connection',
                    name: 'Koneksi Database',
                    status: users.length > 0 ? 'healthy' : 'error',
                    message: users.length > 0 ? 'Database terhubung' : 'Gagal terhubung ke database',
                    severity: users.length > 0 ? 'success' : 'critical',
                },
                {
                    id: 'expired_sessions',
                    name: 'Sesi Kadaluarsa',
                    status: expiredSessions.length === 0 ? 'healthy' : 'warning',
                    message: expiredSessions.length === 0
                        ? 'Tidak ada sesi kadaluarsa'
                        : `${expiredSessions.length} sesi sudah kadaluarsa dan perlu dibersihkan`,
                    count: expiredSessions.length,
                    severity: expiredSessions.length > 50 ? 'warning' : 'info',
                    fixable: true,
                    fixAction: 'clean_sessions',
                },
                {
                    id: 'orphan_students',
                    name: 'Siswa Tanpa Akun User',
                    status: orphanStudents.length === 0 ? 'healthy' : 'warning',
                    message: orphanStudents.length === 0
                        ? 'Semua data siswa memiliki akun user'
                        : `${orphanStudents.length} record siswa tidak memiliki akun user terkait`,
                    count: orphanStudents.length,
                    severity: orphanStudents.length > 0 ? 'warning' : 'success',
                    fixable: true,
                    fixAction: 'remove_orphan_students',
                },
                {
                    id: 'orphan_teachers',
                    name: 'Guru Tanpa Akun User',
                    status: orphanTeachers.length === 0 ? 'healthy' : 'warning',
                    message: orphanTeachers.length === 0
                        ? 'Semua data guru memiliki akun user'
                        : `${orphanTeachers.length} record guru tidak memiliki akun user terkait`,
                    count: orphanTeachers.length,
                    severity: orphanTeachers.length > 0 ? 'warning' : 'success',
                    fixable: true,
                    fixAction: 'remove_orphan_teachers',
                },
                {
                    id: 'empty_quizzes',
                    name: 'Kuis Aktif Tanpa Soal',
                    status: emptyQuizzes.length === 0 ? 'healthy' : 'warning',
                    message: emptyQuizzes.length === 0
                        ? 'Semua kuis aktif memiliki soal'
                        : `${emptyQuizzes.length} kuis aktif tidak memiliki soal: ${emptyQuizzes.map((q: any) => q.title).join(', ')}`,
                    count: emptyQuizzes.length,
                    severity: emptyQuizzes.length > 0 ? 'warning' : 'success',
                },
                {
                    id: 'empty_exams',
                    name: 'Ulangan Aktif Tanpa Soal',
                    status: emptyExams.length === 0 ? 'healthy' : 'warning',
                    message: emptyExams.length === 0
                        ? 'Semua ulangan aktif memiliki soal'
                        : `${emptyExams.length} ulangan aktif tidak memiliki soal: ${emptyExams.map((e: any) => e.title).join(', ')}`,
                    count: emptyExams.length,
                    severity: emptyExams.length > 0 ? 'warning' : 'success',
                },
                {
                    id: 'ungraded_submissions',
                    name: 'Tugas Belum Dinilai',
                    status: (ungradedSubmissionsResult.data?.length || 0) === 0 ? 'healthy' : 'info',
                    message: (ungradedSubmissionsResult.data?.length || 0) === 0
                        ? 'Semua tugas sudah dinilai'
                        : `${ungradedSubmissionsResult.data?.length} tugas menunggu penilaian guru`,
                    count: ungradedSubmissionsResult.data?.length || 0,
                    severity: 'info',
                },
                {
                    id: 'no_class_students',
                    name: 'Siswa Tanpa Kelas',
                    status: (noClassStudentsResult.data?.length || 0) === 0 ? 'healthy' : 'warning',
                    message: (noClassStudentsResult.data?.length || 0) === 0
                        ? 'Semua siswa aktif sudah memiliki kelas'
                        : `${noClassStudentsResult.data?.length} siswa aktif belum ditempatkan di kelas`,
                    count: noClassStudentsResult.data?.length || 0,
                    severity: (noClassStudentsResult.data?.length || 0) > 0 ? 'warning' : 'success',
                },
                {
                    id: 'no_role_users',
                    name: 'User Tanpa Role',
                    status: noRoleCount === 0 ? 'healthy' : 'warning',
                    message: noRoleCount === 0
                        ? 'Semua user memiliki role'
                        : `${noRoleCount} user tidak memiliki role/peran`,
                    count: noRoleCount,
                    severity: noRoleCount > 0 ? 'warning' : 'success',
                },
            ],
            stats: {
                totalUsers: users.length,
                admin: adminCount,
                guru: guruCount,
                siswa: siswaCount,
                wali: waliCount,
                totalStudents: studentsResult.data?.length || 0,
                totalTeachers: teachersResult.data?.length || 0,
                totalClasses: classesResult.data?.length || 0,
                activeSessions: activeSessions.length,
                activeAcademicYear: (academicYearsResult.data || []).find((y: any) => y.is_active)?.year || 'Tidak ada',
            },
        }

        // Set overall status
        const hasCritical = diagnostics.checks.some(c => c.severity === 'critical')
        const hasWarning = diagnostics.checks.some(c => c.severity === 'warning')
        diagnostics.status = hasCritical ? 'critical' : hasWarning ? 'warning' : 'ok'

        return NextResponse.json(diagnostics)
    } catch (error) {
        console.error('Diagnostics error:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}
