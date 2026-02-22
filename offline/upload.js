/**
 * upload.js — Sync Local Results to Supabase
 * 
 * Usage: node upload.js
 * 
 * Uploads quiz_submissions and assignment_submissions
 * that haven't been uploaded yet (uploaded = 0).
 * 
 * Error mitigations:
 *   E20: Connectivity check before upload
 *   E21: Explicit column mapping (skip `source`)
 *   E22: Track uploaded rows, ON CONFLICT for idempotency
 *   E28: Per-row upload with individual error handling
 *   E29: Catch FK constraint errors (deleted students)
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('');
    console.error('═══════════════════════════════════════════════════');
    console.error('  ❌ FILE .env.local TIDAK DITEMUKAN ATAU TIDAK LENGKAP');
    console.error('═══════════════════════════════════════════════════');
    process.exit(1);
}

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Check if offline.db exists
const fs = require('fs');
const DB_PATH = path.join(__dirname, 'data', 'offline.db');
if (!fs.existsSync(DB_PATH)) {
    console.error('');
    console.error('═══════════════════════════════════════════════════');
    console.error('  ❌ DATABASE OFFLINE TIDAK DITEMUKAN');
    console.error('═══════════════════════════════════════════════════');
    console.error('  File offline.db belum ada.');
    console.error('  Jalankan MULAI_UJIAN_OFFLINE.bat terlebih dahulu.');
    console.error('═══════════════════════════════════════════════════');
    process.exit(1);
}

const db = require('./db');

async function checkConnectivity() {
    try {
        const { error } = await supabase.from('teachers').select('id').limit(1);
        if (error) throw error;
        return true;
    } catch (err) {
        return false;
    }
}

async function uploadResults() {
    console.log('');
    console.log('╔═══════════════════════════════════════════════════╗');
    console.log('║       📤 UPLOAD HASIL UJIAN KE SUPABASE          ║');
    console.log('╚═══════════════════════════════════════════════════╝');
    console.log('');

    // E20: Check internet connectivity
    console.log('🌐 Memeriksa koneksi internet...');
    const isOnline = await checkConnectivity();
    if (!isOnline) {
        console.error('');
        console.error('═══════════════════════════════════════════════════');
        console.error('  ❌ TIDAK ADA KONEKSI INTERNET');
        console.error('═══════════════════════════════════════════════════');
        console.error('  Pastikan laptop terhubung ke internet,');
        console.error('  lalu jalankan script ini lagi.');
        console.error('═══════════════════════════════════════════════════');
        process.exit(1);
    }
    console.log('  ✅ Koneksi internet OK');

    // ── Upload Quiz Submissions ──
    console.log('');
    console.log('📝 Mengupload jawaban kuis...');
    const quizSubs = db.prepare(
        'SELECT * FROM quiz_submissions WHERE uploaded = 0'
    ).all();

    let quizSuccess = 0;
    let quizFail = 0;

    for (const sub of quizSubs) {
        try {
            // E21: Map local columns to Supabase columns
            // Parse answers from TEXT back to JSONB
            let answers;
            try {
                answers = JSON.parse(sub.answers);
            } catch {
                answers = [];
            }

            const payload = {
                quiz_id: sub.quiz_id,
                student_id: sub.student_id,
                answers: answers,  // JSONB in Supabase
                total_score: sub.total_score,
                max_score: sub.max_score,
                submitted_at: sub.submitted_at,
                is_graded: true,
                started_at: sub.submitted_at  // approximate
            };
            // Note: NOT including 'source' column (E21: doesn't exist in Supabase)

            // E22: Upsert to handle duplicate uploads
            const { error } = await supabase
                .from('quiz_submissions')
                .upsert(payload, { onConflict: 'quiz_id,student_id' });

            if (error) {
                // E29: FK constraint (student deleted)
                if (error.message.includes('violates foreign key')) {
                    console.warn(`  ⚠️  Skip: student ${sub.student_id} tidak ada di Supabase`);
                } else {
                    console.error(`  ❌ Gagal upload kuis sub: ${error.message}`);
                }
                quizFail++;
            } else {
                // Mark as uploaded
                db.prepare('UPDATE quiz_submissions SET uploaded = 1 WHERE id = ?').run(sub.id);
                quizSuccess++;
            }
        } catch (err) {
            console.error(`  ❌ Error upload kuis: ${err.message}`);
            quizFail++;
        }
    }

    if (quizSubs.length === 0) {
        console.log('  ℹ️  Tidak ada jawaban kuis baru untuk diupload');
    } else {
        console.log(`  ✅ Kuis: ${quizSuccess}/${quizSubs.length} berhasil diupload`);
        if (quizFail > 0) {
            console.warn(`  ⚠️  ${quizFail} gagal (lihat log di atas)`);
        }
    }

    // ── Upload Assignment Submissions ──
    console.log('');
    console.log('📋 Mengupload jawaban tugas...');
    const assignSubs = db.prepare(
        'SELECT * FROM assignment_submissions WHERE uploaded = 0'
    ).all();

    let assignSuccess = 0;
    let assignFail = 0;

    for (const sub of assignSubs) {
        try {
            // E21: Map to Supabase student_submissions table
            // answers field is JSONB array: [{question_id, answer}]
            const payload = {
                assignment_id: sub.assignment_id,
                student_id: sub.student_id,
                answers: [{ answer: sub.answer_text }],  // JSONB format
                submitted_at: sub.submitted_at
            };

            const { error } = await supabase
                .from('student_submissions')
                .upsert(payload, { onConflict: 'assignment_id,student_id' });

            if (error) {
                if (error.message.includes('violates foreign key')) {
                    console.warn(`  ⚠️  Skip: student/assignment FK error`);
                } else {
                    console.error(`  ❌ Gagal upload tugas: ${error.message}`);
                }
                assignFail++;
            } else {
                db.prepare('UPDATE assignment_submissions SET uploaded = 1 WHERE id = ?').run(sub.id);
                assignSuccess++;
            }
        } catch (err) {
            console.error(`  ❌ Error upload tugas: ${err.message}`);
            assignFail++;
        }
    }

    if (assignSubs.length === 0) {
        console.log('  ℹ️  Tidak ada jawaban tugas baru untuk diupload');
    } else {
        console.log(`  ✅ Tugas: ${assignSuccess}/${assignSubs.length} berhasil diupload`);
        if (assignFail > 0) {
            console.warn(`  ⚠️  ${assignFail} gagal (lihat log di atas)`);
        }
    }

    // ── Summary ──
    const totalUploaded = quizSuccess + assignSuccess;
    const totalFailed = quizFail + assignFail;

    console.log('');
    console.log('╔═══════════════════════════════════════════════════╗');
    if (totalFailed === 0) {
        console.log('║       ✅ UPLOAD SELESAI                          ║');
    } else {
        console.log('║       ⚠️  UPLOAD SELESAI (DENGAN ERROR)          ║');
    }
    console.log('╚═══════════════════════════════════════════════════╝');
    console.log(`  Total diupload: ${totalUploaded}`);
    if (totalFailed > 0) {
        console.log(`  Total gagal:    ${totalFailed}`);
    }
    console.log('');
}

uploadResults().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
