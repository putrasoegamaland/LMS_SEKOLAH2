import { NextRequest, NextResponse } from 'next/server'
import { validateSession } from '@/lib/auth'
import { parseGeminiJson } from '@/lib/parse-gemini-json'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY

// POST - Extract questions from uploaded PDF/Word document using Gemini
export async function POST(request: NextRequest) {
    try {
        const token = request.cookies.get('session_token')?.value
        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const user = await validateSession(token)
        if (!user || user.role !== 'GURU') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        if (!GEMINI_API_KEY) {
            return NextResponse.json({ error: 'Gemini API key not configured' }, { status: 500 })
        }

        const formData = await request.formData()
        const file = formData.get('file') as File | null

        if (!file) {
            return NextResponse.json({ error: 'File diperlukan' }, { status: 400 })
        }

        const fileName = file.name.toLowerCase()
        const isWord = fileName.endsWith('.docx') || fileName.endsWith('.doc')

        if (!isWord) {
            return NextResponse.json({ error: 'Format file harus Word (.docx)' }, { status: 400 })
        }

        // Convert file to buffer
        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)

        let extractedText = ''

        if (isWord) {
            const mammoth = await import('mammoth')
            const result = await mammoth.extractRawText({ buffer })
            extractedText = result.value
        }

        if (!extractedText || !extractedText.trim()) {
            return NextResponse.json({ error: 'Tidak dapat mengekstrak teks dari dokumen. Pastikan file tidak kosong.' }, { status: 400 })
        }

        // Truncate if too long (Gemini has token limits)
        const maxLength = 30000
        if (extractedText.length > maxLength) {
            extractedText = extractedText.substring(0, maxLength)
        }

        // Call Gemini API to parse questions from extracted text
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [
                        {
                            parts: [
                                {
                                    text: `Kamu adalah asisten yang membantu guru merapikan soal ujian/kuis.

Berikut adalah teks yang di-extract dari dokumen Word (.docx). Teksnya mungkin berantakan karena hasil konversi.

Tugasmu:
1. Parse dan identifikasi setiap soal dari teks
2. Bersihkan format tanpa mengubah ISI soal sedikitpun
3. Hapus nomor soal di depan (1., 2., dst)
4. Tentukan tipe: "MULTIPLE_CHOICE" jika ada pilihan A/B/C/D/E, atau "ESSAY" jika tidak
5. Pisahkan opsi pilihan ganda menjadi array terpisah
6. Jika ada kunci jawaban, tentukan jawaban yang benar
7. Tentukan tingkat kesulitan: "EASY", "MEDIUM", atau "HARD"
8. JIKA ADA TEKS BACAAN (Passage) untuk beberapa soal (Contoh: "Teks untuk soal no 1-3"):
   - Masukkan teks tersebut ke field "passage_text" untuk SETIAP soal yang relevan.
   - Jangan masukkan teks bacaan ke dalam "question_text".

PENTING — KONTEN KHUSUS:

📐 MATEMATIKA:
- Semua ekspresi matematika HARUS dibungkus dengan tanda dolar: $...$ untuk inline, $$...$$ untuk display/block
- Contoh: "Tentukan nilai x jika $2x^2 + 3x - 5 = 0$"
- Contoh: "Hitung $\\log_2(x-1) + \\log_2(x+3) = 3$"
- Contoh: "Nilai dari $\\int_0^1 (3x^2 - 4x + 2) \\, dx$ adalah ..."
- Gunakan LaTeX untuk simbol: $\\sqrt{x}$, $x^2$, $\\pi$, $\\infty$, $\\leq$, $\\geq$, $\\neq$, $\\times$, $\\div$, $\\pm$

🕌 BAHASA ARAB:
- PERTAHANKAN semua teks Arab apa adanya, termasuk harakat (fathah, kasrah, dhammah, dll)
- PERTAHANKAN arah teks (right-to-left)
- Jika soal campuran Arab-Indonesia, pertahankan keduanya
- Jangan transliterasi teks Arab ke huruf latin

PENTING LAINNYA:
- JANGAN ubah isi/konten soal, hanya rapikan format
- JANGAN sertakan huruf A/B/C/D di awal opsi
- Contoh SALAH: ["A. Jakarta", "B. Bandung"]
- Contoh BENAR: ["Jakarta", "Bandung"]
- Balas HANYA dengan JSON valid, tanpa markdown atau teks lain

Format JSON:
{
  "questions": [
    {
      "question_text": "Teks soal yang sudah rapi",
      "question_type": "MULTIPLE_CHOICE atau ESSAY",
      "options": ["opsi 1", "opsi 2", "opsi 3", "opsi 4"] atau null,
      "correct_answer": "A/B/C/D" atau null,
      "difficulty": "EASY/MEDIUM/HARD",
      "passage_text": "Teks bacaan panjang jika ada (opsional)"
    }
  ]
}

Berikut teks dari dokumen:

${extractedText}`
                                }
                            ]
                        }
                    ],
                    generationConfig: {
                        temperature: 0.1,
                        maxOutputTokens: 8192,
                        responseMimeType: 'application/json',
                    }
                })
            }
        )

        if (!response.ok) {
            const errorText = await response.text()
            console.error('Gemini API error:', errorText)
            return NextResponse.json({ error: 'Gemini API error' }, { status: 500 })
        }

        const result = await response.json()
        const textContent = result.candidates?.[0]?.content?.parts?.[0]?.text

        if (!textContent) {
            return NextResponse.json({ error: 'No response from Gemini' }, { status: 500 })
        }

        try {
            const parsed = parseGeminiJson(textContent)
            return NextResponse.json(parsed)
        } catch (parseError: any) {
            console.error('JSON parse error:', parseError?.message, 'Raw:', textContent.substring(0, 300))
            return NextResponse.json({
                error: 'Gagal memproses respons AI',
                raw: textContent
            }, { status: 500 })
        }

    } catch (error) {
        console.error('Error in extract-document:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}
