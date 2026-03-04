import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/supabase'
import { getSchoolContextOrError, isErrorResponse } from '@/lib/schoolContext'

/**
 * POST /api/schools/[id]/logo
 * Upload school logo (SUPER_ADMIN only)
 * Accepts multipart/form-data with 'logo' file field
 */
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: schoolId } = await params
        const ctx = await getSchoolContextOrError(request)
        if (isErrorResponse(ctx)) return ctx
        const { user } = ctx

        if (user.role !== 'SUPER_ADMIN') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const formData = await request.formData()
        const file = formData.get('logo') as File | null

        if (!file) {
            return NextResponse.json({ error: 'File logo harus dikirim' }, { status: 400 })
        }

        // Validate file type
        const allowedTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
        if (!allowedTypes.includes(file.type)) {
            return NextResponse.json({ error: 'Format yang didukung: PNG, JPG, WebP, SVG' }, { status: 400 })
        }

        // Max 2MB
        if (file.size > 2 * 1024 * 1024) {
            return NextResponse.json({ error: 'Ukuran file maksimal 2MB' }, { status: 400 })
        }

        const ext = file.name.split('.').pop() || 'png'
        const storagePath = `logos/${schoolId}.${ext}`

        // Upload to Supabase storage
        const buffer = Buffer.from(await file.arrayBuffer())
        const { error: uploadError } = await supabase.storage
            .from('uploads')
            .upload(storagePath, buffer, {
                contentType: file.type,
                upsert: true // overwrite existing logo
            })

        if (uploadError) throw uploadError

        // Get public URL
        const { data: urlData } = supabase.storage
            .from('uploads')
            .getPublicUrl(storagePath)

        const logo_url = urlData.publicUrl

        // Update school record
        const { error: updateError } = await supabase
            .from('schools')
            .update({ logo_url })
            .eq('id', schoolId)

        if (updateError) throw updateError

        return NextResponse.json({ logo_url })
    } catch (error) {
        console.error('Error uploading logo:', error)
        return NextResponse.json({ error: 'Gagal upload logo' }, { status: 500 })
    }
}
