import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { validateSession, hashPassword } from '@/lib/auth'

export async function POST(request: NextRequest) {
    try {
        const token = request.cookies.get('session_token')?.value
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const authUser = await validateSession(token)
        if (!authUser || authUser.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const payload = await request.json()
        if (!Array.isArray(payload)) {
            return NextResponse.json({ error: 'Payload harus berupa array' }, { status: 400 })
        }

        const results = []

        // Process sequentially to avoid event loop blocking from bcrypt and DB rate limits
        for (const item of payload) {
            const { full_name, gender, nip, username, password } = item

            if (!username || !password || !full_name) {
                results.push({ item, success: false, error: 'Nama, Username, dan Password harus diisi' })
                continue
            }

            try {
                // Check if username exists
                const { data: existingUser } = await supabase
                    .from('users')
                    .select('id')
                    .eq('username', username)
                    .single()

                if (existingUser) {
                    results.push({ item, success: false, error: 'Username sudah digunakan' })
                    continue
                }

                // Hash password
                const password_hash = await hashPassword(password)

                // Create user
                const { data: newUser, error: userError } = await supabase
                    .from('users')
                    .insert({
                        username,
                        password_hash,
                        full_name,
                        role: 'GURU'
                    })
                    .select()
                    .single()

                if (userError) throw userError

                // Create teacher record
                const { error: teacherError } = await supabase
                    .from('teachers')
                    .insert({
                        user_id: newUser.id,
                        nip: nip || null,
                        gender: gender === 'L' || gender === 'P' ? gender : null
                    })

                if (teacherError) {
                    await supabase.from('users').delete().eq('id', newUser.id)
                    throw teacherError
                }

                results.push({ item, success: true })
            } catch (err: any) {
                console.error(`Error processing teacher ${username}:`, err)
                results.push({ item, success: false, error: err.message || 'Terjadi kesalahan sistem' })
            }
        }

        return NextResponse.json({ results })
    } catch (error) {
        console.error('Error in bulk teacher upload:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}
