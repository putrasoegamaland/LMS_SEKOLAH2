import { NextRequest, NextResponse } from 'next/server'
import { validateSession, verifyPassword, hashPassword } from '@/lib/auth'
import { supabaseAdmin as supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
    try {
        const sessionToken = request.cookies.get('session_token')?.value

        if (!sessionToken) {
            return NextResponse.json({ error: 'Tidak ada session' }, { status: 401 })
        }

        const user = await validateSession(sessionToken)
        if (!user) {
            return NextResponse.json({ error: 'Session tidak valid' }, { status: 401 })
        }

        const { current_password, new_password } = await request.json()

        if (!current_password || !new_password) {
            return NextResponse.json({ error: 'Password lama dan baru harus diisi' }, { status: 400 })
        }

        if (new_password.length < 6) {
            return NextResponse.json({ error: 'Password baru minimal 6 karakter' }, { status: 400 })
        }

        if (current_password === new_password) {
            return NextResponse.json({ error: 'Password baru tidak boleh sama dengan password lama' }, { status: 400 })
        }

        // Get current user hash
        const { data: userData, error: fetchError } = await supabase
            .from('users')
            .select('password_hash')
            .eq('id', user.id)
            .single()

        if (fetchError || !userData) {
            return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 })
        }

        // Verify old password
        const isValid = await verifyPassword(current_password, userData.password_hash)
        if (!isValid) {
            return NextResponse.json({ error: 'Password lama salah' }, { status: 400 })
        }

        // Hash new password
        const newHash = await hashPassword(new_password)

        // Update database and clear must_change_password flag
        const { error: updateError } = await supabase
            .from('users')
            .update({
                password_hash: newHash,
                must_change_password: false
            })
            .eq('id', user.id)

        if (updateError) {
            console.error('Password update error:', updateError)
            return NextResponse.json({ error: 'Gagal memperbarui password' }, { status: 500 })
        }

        return NextResponse.json({ success: true, message: 'Password berhasil diperbarui' })

    } catch (error) {
        console.error('Change password error:', error)
        return NextResponse.json({ error: 'Terjadi kesalahan internal server' }, { status: 500 })
    }
}
