import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { validateSession } from '@/lib/auth'

// GET submissions (for teacher or student)
export async function GET(request: NextRequest) {
    try {
        const token = request.cookies.get('session_token')?.value
        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const user = await validateSession(token)
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const quizId = request.nextUrl.searchParams.get('quiz_id')
        const studentId = request.nextUrl.searchParams.get('student_id')

        let query = supabase
            .from('quiz_submissions')
            .select(`
                *,
                quiz:quizzes(
                    id,
                    title,
                    teaching_assignment:teaching_assignments(
                        subject:subjects(name)
                    )
                ),
                student:students(
                    id,
                    nis,
                    user:users(full_name)
                )
            `)
            .order('submitted_at', { ascending: false })

        if (quizId) {
            query = query.eq('quiz_id', quizId)
        }
        if (studentId) {
            query = query.eq('student_id', studentId)
        }

        const { data, error } = await query

        if (error) throw error

        return NextResponse.json(data)
    } catch (error) {
        console.error('Error fetching quiz submissions:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}

// POST submit quiz (for student)
export async function POST(request: NextRequest) {
    try {
        const token = request.cookies.get('session_token')?.value
        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const user = await validateSession(token)
        if (!user || user.role !== 'SISWA') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { quiz_id, answers, started_at } = await request.json()

        if (!quiz_id || !answers) {
            return NextResponse.json({ error: 'Quiz ID dan jawaban diperlukan' }, { status: 400 })
        }

        // Get student
        const { data: student } = await supabase
            .from('students')
            .select('id')
            .eq('user_id', user.id)
            .single()

        if (!student) {
            return NextResponse.json({ error: 'Student not found' }, { status: 404 })
        }

        // Get quiz questions for auto-grading
        const { data: questions } = await supabase
            .from('quiz_questions')
            .select('*')
            .eq('quiz_id', quiz_id)

        if (!questions) {
            return NextResponse.json({ error: 'Quiz not found' }, { status: 404 })
        }

        // Auto-grade multiple choice and calculate scores
        let totalScore = 0
        let maxScore = 0
        let allGraded = true

        const gradedAnswers = answers.map((ans: { question_id: string; answer: string }) => {
            const question = questions.find(q => q.id === ans.question_id)
            if (!question) return ans

            maxScore += question.points

            if (question.question_type === 'MULTIPLE_CHOICE') {
                const isCorrect = ans.answer?.toUpperCase() === question.correct_answer?.toUpperCase()
                const score = isCorrect ? question.points : 0
                totalScore += score
                return {
                    ...ans,
                    is_correct: isCorrect,
                    score
                }
            } else {
                // Essay needs manual grading
                allGraded = false
                return {
                    ...ans,
                    is_correct: null,
                    score: null
                }
            }
        })

        // Check if already submitted
        const { data: existing } = await supabase
            .from('quiz_submissions')
            .select('id')
            .eq('quiz_id', quiz_id)
            .eq('student_id', student.id)
            .single()

        if (existing) {
            // Update existing submission
            const { data, error } = await supabase
                .from('quiz_submissions')
                .update({
                    answers: gradedAnswers,
                    submitted_at: new Date().toISOString(),
                    total_score: totalScore,
                    max_score: maxScore,
                    is_graded: allGraded
                })
                .eq('id', existing.id)
                .select()
                .single()

            if (error) throw error
            return NextResponse.json(data)
        }

        // Create new submission
        const { data, error } = await supabase
            .from('quiz_submissions')
            .insert({
                quiz_id,
                student_id: student.id,
                started_at: started_at || new Date().toISOString(),
                submitted_at: new Date().toISOString(),
                answers: gradedAnswers,
                total_score: totalScore,
                max_score: maxScore,
                is_graded: allGraded
            })
            .select()
            .single()

        if (error) throw error

        // Notify the teacher about new quiz submission
        try {
            const { data: quiz } = await supabase
                .from('quizzes')
                .select(`
                    title,
                    teaching_assignment:teaching_assignments(
                        teacher:teachers(user_id)
                    )
                `)
                .eq('id', quiz_id)
                .single()

            const teacherUserId = (quiz?.teaching_assignment as any)?.teacher?.user_id
            if (teacherUserId) {
                await supabase.from('notifications').insert({
                    user_id: teacherUserId,
                    type: 'SUBMISSION_KUIS',
                    title: 'Kuis Dikumpulkan',
                    message: `${user.full_name} telah mengumpulkan kuis "${quiz?.title}"`,
                    link: `/dashboard/guru/kuis`
                })
            }
        } catch (notifError) {
            console.error('Error sending quiz submission notification:', notifError)
        }

        return NextResponse.json(data)
    } catch (error) {
        console.error('Error submitting quiz:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}
