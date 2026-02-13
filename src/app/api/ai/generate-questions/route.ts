import { NextRequest, NextResponse } from 'next/server'
import { validateSession } from '@/lib/auth'
import { parseGeminiJson } from '@/lib/parse-gemini-json'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY

// POST - Generate questions from material using Gemini
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

        const { material, count, type, difficulty } = await request.json()

        if (!material || material.trim().length < 50) {
            return NextResponse.json({ error: 'Materi terlalu pendek. Masukkan materi pembelajaran yang cukup (minimal 50 karakter) agar AI dapat membuat soal yang akurat.' }, { status: 400 })
        }

        const questionCount = count || 5
        const questionType = type || 'MIXED' // MULTIPLE_CHOICE, ESSAY, MIXED
        const difficultyLevel = difficulty || 'MEDIUM' // EASY, MEDIUM, HARD

        let typeInstruction = ''
        if (questionType === 'MULTIPLE_CHOICE') {
            typeInstruction = 'Semua soal harus pilihan ganda dengan 4 opsi (A, B, C, D) dan kunci jawaban.'
        } else if (questionType === 'ESSAY') {
            typeInstruction = 'Semua soal harus berbentuk essay/uraian.'
        } else {
            typeInstruction = 'Buat campuran soal pilihan ganda dan essay.'
        }

        let difficultyInstruction = ''
        if (difficultyLevel === 'EASY') {
            difficultyInstruction = 'Buat soal dengan tingkat kesulitan MUDAH, fokus pada pemahaman dasar.'
        } else if (difficultyLevel === 'HARD') {
            difficultyInstruction = 'Buat soal dengan tingkat kesulitan SULIT, termasuk analisis dan penerapan konsep.'
        } else {
            difficultyInstruction = 'Buat soal dengan tingkat kesulitan SEDANG.'
        }

        // Call Gemini API
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [
                        {
                            parts: [
                                {
                                    text: `Kamu adalah guru profesional yang HANYA membuat soal berdasarkan materi yang diberikan.

ATURAN KETAT — WAJIB DIIKUTI:
1. Kamu HANYA boleh membuat soal dari informasi yang ADA di dalam materi di bawah ini.
2. DILARANG KERAS menggunakan pengetahuan umum atau informasi di luar materi yang diberikan.
3. Setiap soal HARUS bisa dijawab dengan membaca materi yang diberikan saja.
4. Jika materi tidak cukup untuk membuat ${questionCount} soal, buat soal sebanyak mungkin yang bisa dibuat dari materi tersebut.
5. JANGAN mengarang fakta, angka, atau informasi yang tidak ada dalam materi.

${typeInstruction}
${difficultyInstruction}

===== MATERI DARI GURU (SATU-SATUNYA SUMBER SOAL) =====
${material}
===== AKHIR MATERI =====

Buatlah ${questionCount} soal berdasarkan HANYA materi di atas.

PENTING: Balas HANYA dengan JSON valid, tanpa markdown atau teks lain.
Format JSON:
{
  "questions": [
    {
      "question_text": "Teks soal lengkap dan jelas",
      "question_type": "MULTIPLE_CHOICE atau ESSAY",
      "options": ["isi opsi 1", "isi opsi 2", "isi opsi 3", "isi opsi 4"] (null jika essay),
      "correct_answer": "A/B/C/D" (null jika essay),
      "difficulty": "EASY/MEDIUM/HARD"
    }
  ]
}

PENTING untuk options:
- JANGAN sertakan huruf A/B/C/D di awal opsi
- Contoh SALAH: ["A. Jakarta", "B. Bandung"]
- Contoh BENAR: ["Jakarta", "Bandung"]

KONTEN KHUSUS:
📐 Jika materi mengandung MATEMATIKA: bungkus semua ekspresi matematika dalam $...$ (inline) atau $$...$$ (display). Contoh: "$\\log_2(x)$", "$\\int_0^1 f(x) \\, dx$", "$x^2 + 3x - 5 = 0$". Gunakan LaTeX: $\\sqrt{}$, $\\frac{}{}$, $\\pi$, dll.
🕌 Jika materi mengandung BAHASA ARAB: pertahankan teks Arab apa adanya termasuk harakat. Jangan transliterasi ke huruf latin.

Pastikan soal:
1. 100% berdasarkan materi yang diberikan, BUKAN dari pengetahuan AI
2. Bervariasi dalam topik (selama masih dalam materi)
3. Jelas dan tidak ambigu
4. Untuk pilihan ganda, pengecoh harus masuk akal tapi tetap berasal dari konteks materi`

                                }
                            ]
                        }
                    ],
                    generationConfig: {
                        temperature: 0.3,
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
                error: 'Failed to parse response',
                raw: textContent
            }, { status: 500 })
        }

    } catch (error) {
        console.error('Error generating questions:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}
