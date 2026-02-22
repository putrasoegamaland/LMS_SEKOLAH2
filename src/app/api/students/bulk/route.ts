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

        // Fetch all classes to map class names to IDs
        const { data: classesData, error: classesError } = await supabase
            .from('classes')
            .select('id, name')

        if (classesError) throw classesError

        // Create a lookup map for classes (case-insensitive)
        const classMap = new Map<string, string>()
        classesData?.forEach(c => {
            classMap.set(c.name.trim().toLowerCase(), c.id)
        })

        const results = []

        // Process sequentially
        for (const item of payload) {
            const { full_name, gender, nis, angkatan, kelas, username, password } = item

            if (!username || !password || !full_name) {
                results.push({ item, success: false, error: 'Nama, Username, dan Password harus diisi' })
                continue
            }

            // Map Class Name to ID if provided
            let mapped_class_id = null
            if (kelas) {
                const searchStr = String(kelas).trim().toLowerCase()
                mapped_class_id = classMap.get(searchStr)
                if (!mapped_class_id) {
                    results.push({ item, success: false, error: `Kelas '${kelas}' tidak ditemukan di sistem` })
                    continue
                }
            }

            try {
                // Check existing username
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
                const password_hash = await hashPassword(String(password))

                // Create user
                const { data: newUser, error: userError } = await supabase
                    .from('users')
                    .insert({
                        username: String(username),
                        password_hash,
                        full_name: String(full_name),
                        role: 'SISWA'
                    })
                    .select()
                    .single()

                if (userError) throw userError

                // Create student record
                const { error: studentError } = await supabase
                    .from('students')
                    .insert({
                        user_id: newUser.id,
                        nis: nis ? String(nis) : null,
                        class_id: mapped_class_id,
                        gender: gender === 'L' || gender === 'P' ? gender : null,
                        angkatan: angkatan ? String(angkatan) : null,
                        status: 'ACTIVE'
                    })

                if (studentError) {
                    // Rollback
                    await supabase.from('users').delete().eq('id', newUser.id)
                    throw studentError
                }

                results.push({ item, success: true })
            } catch (err: any) {
                console.error(`Error processing student ${username}:`, err)
                results.push({ item, success: false, error: err.message || 'Terjadi kesalahan sistem' })
            }
        }

        return NextResponse.json({ results })
    } catch (error) {
        console.error('Error in bulk student upload:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}
