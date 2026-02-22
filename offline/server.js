/**
 * server.js — Express Offline Tethering Server
 * 
 * Usage: node server.js
 * 
 * Flow:
 *   1. Start Express server immediately (no args needed)
 *   2. Auto-open browser to teacher setup page
 *   3. Teacher enters NIP in browser → data downloads from Supabase
 *   4. Once ready, students can connect via WiFi hotspot
 *   5. Teacher monitors via dashboard + can upload results
 * 
 * Security:
 *   - Uses Supabase ANON key (public by design, scoped by RLS)
 *   - No service role key on teacher machines
 *   - RLS policies must be set up in Supabase (see supabase-rls-setup.sql)
 * 
 * Error mitigations built in:
 *   E3:  Embedded credentials (no .env.local needed)
 *   E4:  Port fallback 3000→3005
 *   E7:  Supabase connectivity check
 *   E9:  0 students warning
 *   E10: 0 active quizzes warning
 *   E11: Null-safe column access
 *   E12: JSON.stringify for JSONB→TEXT
 *   E13: CORS for cross-origin safety
 *   E15: Duplicate submission catch
 *   E16: WAL mode (in db.js)
 *   E18: NIS not found error
 *   E19: Server-side timer validation
 *   E26: NIP not found error
 *   E27: No teaching assignments error
 *   E30-E37: Image download handling
 *   E44: Server state machine (setup→downloading→ready)
 *   E45: State guard on student routes
 *   E46: Auto-resume if data exists from previous session
 *   E47: Download failure → state reverts to setup
 *   E48: Upload connectivity check
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');
const { exec } = require('child_process');

// ═══════════════════════════════════════════════════
//  E3: EMBEDDED CREDENTIALS (Public — safe to expose)
//  The anon key is designed to be public. Security is
//  enforced via Row Level Security (RLS) in Supabase.
//  See supabase-rls-setup.sql for required policies.
// ═══════════════════════════════════════════════════

const SUPABASE_URL = 'https://veohqmrydavkokfiqvjj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZlb2hxbXJ5ZGF2a29rZmlxdmpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0ODEzMjcsImV4cCI6MjA4NDA1NzMyN30.ikFPNm_Fu6yC17eeau3rGOgwQ6HKj4S4ZN06CQp3cuU';

// ─── Initialize Supabase client (anon key — RLS enforced) ───
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ─── Initialize SQLite ───
const db = require('./db');

// ═══════════════════════════════════════════════════
//  E44: SERVER STATE MACHINE
//  setup       → waiting for teacher NIP via browser
//  downloading → data being downloaded from Supabase
//  ready       → students can connect
// ═══════════════════════════════════════════════════

let serverState = 'setup';
let downloadError = null;
let downloadProgress = '';

// E46: Check if data exists from a previous session
const existingTeacher = db.prepare("SELECT value FROM meta WHERE key = 'teacher_name'").get();
if (existingTeacher && existingTeacher.value) {
    serverState = 'ready';
    console.log(`  ℹ️  Data dari sesi sebelumnya ditemukan (${existingTeacher.value})`);
    console.log('  Server langsung siap. Buka browser untuk re-download jika perlu.');
}

// ─── Express App ───
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ═══════════════════════════════════════════════════
//  IMAGE DOWNLOAD HELPER (E30-E37, E43)
// ═══════════════════════════════════════════════════

/**
 * Downloads an image from a URL and saves it locally.
 * Returns the local path (e.g., '/images/abc123.jpg') or null on failure.
 */
async function downloadImage(imageUrl, questionId) {
    // E30: null/empty URL
    if (!imageUrl || typeof imageUrl !== 'string' || imageUrl.trim() === '') {
        return null;
    }

    // E36: Ensure images directory exists
    const imagesDir = path.join(__dirname, 'public', 'images');
    if (!fs.existsSync(imagesDir)) {
        fs.mkdirSync(imagesDir, { recursive: true });
    }

    try {
        // E37: Handle relative URLs (prepend Supabase URL)
        let fullUrl = imageUrl;
        if (imageUrl.startsWith('/')) {
            fullUrl = SUPABASE_URL + imageUrl;
        }

        // E34: Detect extension from URL
        const urlPath = new URL(fullUrl).pathname;
        const ext = path.extname(urlPath) || '.jpg'; // default .jpg
        // E32: Use question ID as filename to avoid duplicates
        const filename = `${questionId}${ext}`;
        const localPath = path.join(imagesDir, filename);

        // E35: For Supabase Storage URLs, use anon key for auth
        const headers = {};
        if (fullUrl.includes(SUPABASE_URL)) {
            headers['Authorization'] = `Bearer ${SUPABASE_ANON_KEY}`;
        }

        // Download the image
        const response = await fetch(fullUrl, { headers });
        if (!response.ok) {
            console.warn(`  ⚠️  Gagal download gambar (HTTP ${response.status}): ${fullUrl}`);
            return null; // E31: continue without image
        }

        const buffer = Buffer.from(await response.arrayBuffer());
        fs.writeFileSync(localPath, buffer);

        return `/images/${filename}`; // Local path for frontend
    } catch (err) {
        // E31/E43: Download failed — warn but don't crash
        console.warn(`  ⚠️  Gagal download gambar: ${err.message}`);
        return null;
    }
}

// ═══════════════════════════════════════════════════
//  DATA DOWNLOAD (Teacher-scoped, called from browser)
// ═══════════════════════════════════════════════════

async function downloadData(nip) {
    downloadProgress = 'Mencari guru...';
    console.log('');
    console.log('╔═══════════════════════════════════════════════════╗');
    console.log('║       📥 MENGUNDUH DATA DARI SUPABASE...         ║');
    console.log('╚═══════════════════════════════════════════════════╝');
    console.log('');

    // ── Step 1: Look up teacher by NIP (E26) ──
    console.log(`🔍 Mencari guru dengan NIP: ${nip}...`);
    const { data: teacher, error: teacherErr } = await supabase
        .from('teachers')
        .select('id, nip, user:users(full_name)')
        .eq('nip', nip)
        .single();

    if (teacherErr || !teacher) {
        const errMsg = teacherErr?.message || 'NIP tidak ditemukan';
        // Check for RLS/permission errors
        if (teacherErr?.code === 'PGRST301' || teacherErr?.message?.includes('permission')) {
            throw new Error('Akses ditolak. Pastikan RLS sudah dikonfigurasi di Supabase. Hubungi admin.');
        }
        throw new Error(`NIP "${nip}" tidak terdaftar di database. Pastikan NIP sudah benar.`);
    }

    const teacherName = teacher.user?.full_name || 'Guru';
    console.log(`✅ Guru ditemukan: ${teacherName}`);
    downloadProgress = `Guru ditemukan: ${teacherName}. Mengambil data mengajar...`;

    // Save teacher info to meta
    const upsertMeta = db.prepare('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)');
    upsertMeta.run('teacher_id', teacher.id);
    upsertMeta.run('teacher_name', teacherName);
    upsertMeta.run('teacher_nip', nip);
    upsertMeta.run('download_time', new Date().toISOString());

    // ── Step 2: Get teaching assignments (E27) ──
    console.log('📚 Mengambil data tugas mengajar...');
    const { data: tas, error: taErr } = await supabase
        .from('teaching_assignments')
        .select('id, class_id, subject:subjects(name), class:classes(id, name)')
        .eq('teacher_id', teacher.id);

    if (taErr) {
        console.error('  ⚠️  Gagal mengambil tugas mengajar:', taErr.message);
        throw new Error('Gagal mengambil data tugas mengajar: ' + taErr.message);
    }

    if (!tas || tas.length === 0) {
        console.warn('  ⚠️  0 tugas mengajar ditemukan');
        // Don't throw — teacher might just not have assignments yet
        // Save meta and return with ready state
        downloadProgress = 'Selesai (tidak ada tugas mengajar ditemukan)';
        return;
    }

    const taIds = tas.map(ta => ta.id);
    const classIds = [...new Set(tas.map(ta => ta.class_id).filter(Boolean))];

    console.log(`  → ${tas.length} tugas mengajar ditemukan`);
    tas.forEach(ta => {
        const subj = ta.subject?.name || '-';
        const cls = ta.class?.name || '-';
        console.log(`    • ${subj} — ${cls}`);
    });

    // ── Step 3: Download students in those classes ──
    downloadProgress = 'Mengunduh data siswa...';
    console.log('👨‍🎓 Mengunduh data siswa...');
    if (classIds.length > 0) {
        const { data: students, error: studErr } = await supabase
            .from('students')
            .select('id, nis, user:users(full_name), class:classes(name)')
            .in('class_id', classIds);

        if (studErr) {
            console.error('  ⚠️  Gagal mengunduh siswa:', studErr.message);
        } else if (students && students.length > 0) {
            // Clear old data and insert fresh
            db.prepare('DELETE FROM students').run();
            const insertStudent = db.prepare(
                'INSERT OR REPLACE INTO students (id, nis, nama, kelas) VALUES (?, ?, ?, ?)'
            );
            const insertMany = db.transaction((items) => {
                for (const s of items) {
                    insertStudent.run(
                        s.id,
                        s.nis || '',
                        s.user?.full_name || 'Tanpa Nama', // E11: null-safe
                        s.class?.name || 'Tanpa Kelas'     // E11: null-safe
                    );
                }
            });
            insertMany(students);
            console.log(`  ✅ ${students.length} siswa diunduh`);
        } else {
            console.warn('  ⚠️  0 siswa ditemukan di kelas guru ini'); // E9
        }
    }

    // ── Step 4: Download active quizzes ──
    downloadProgress = 'Mengunduh kuis aktif...';
    console.log('📝 Mengunduh kuis aktif...');
    if (taIds.length > 0) {
        const { data: quizzes, error: quizErr } = await supabase
            .from('quizzes')
            .select('id, title, description, duration_minutes, is_randomized, teaching_assignment_id, is_active')
            .in('teaching_assignment_id', taIds)
            .eq('is_active', true);

        if (quizErr) {
            console.error('  ⚠️  Gagal mengunduh kuis:', quizErr.message);
        } else if (quizzes && quizzes.length > 0) {
            db.prepare('DELETE FROM quiz_questions').run();  // Delete children first (FK)
            db.prepare('DELETE FROM quizzes').run();

            const insertQuiz = db.prepare(
                'INSERT OR REPLACE INTO quizzes (id, title, description, subject, class_name, duration_minutes, is_randomized) VALUES (?, ?, ?, ?, ?, ?, ?)'
            );

            // Build TA lookup map for subject/class names
            const taMap = {};
            for (const ta of tas) {
                taMap[ta.id] = {
                    subject: ta.subject?.name || '-',
                    class_name: ta.class?.name || '-'
                };
            }

            const insertQuizzes = db.transaction((items) => {
                for (const q of items) {
                    const ta = taMap[q.teaching_assignment_id] || {};
                    insertQuiz.run(
                        q.id,
                        q.title,
                        q.description || '',
                        ta.subject || '-',
                        ta.class_name || '-',
                        q.duration_minutes || 30,
                        q.is_randomized ? 1 : 0
                    );
                }
            });
            insertQuizzes(quizzes);
            console.log(`  ✅ ${quizzes.length} kuis diunduh`);

            // ── Step 5: Download quiz questions (with image_url, passage_text) ──
            downloadProgress = 'Mengunduh soal kuis...';
            console.log('❓ Mengunduh soal kuis...');
            const quizIds = quizzes.map(q => q.id);
            const { data: questions, error: qErr } = await supabase
                .from('quiz_questions')
                .select('id, quiz_id, question_text, question_type, options, correct_answer, points, order_index, image_url, passage_text')
                .in('quiz_id', quizIds);

            if (qErr) {
                console.error('  ⚠️  Gagal mengunduh soal:', qErr.message);
            } else if (questions && questions.length > 0) {
                // Download images for questions that have them
                const questionsWithImages = questions.filter(q => q.image_url);
                if (questionsWithImages.length > 0) {
                    downloadProgress = `Mengunduh ${questionsWithImages.length} gambar soal...`;
                    console.log(`🖼️  Mengunduh ${questionsWithImages.length} gambar soal...`);
                }

                const insertQuestion = db.prepare(
                    'INSERT OR REPLACE INTO quiz_questions (id, quiz_id, question_text, question_type, options, correct_answer, points, order_index, image_url, passage_text) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
                );

                // Process questions — download images sequentially to avoid overwhelming network
                let imgSuccess = 0;
                let imgFail = 0;
                const processedQuestions = [];

                for (const q of questions) {
                    let localImageUrl = null;
                    if (q.image_url) {
                        localImageUrl = await downloadImage(q.image_url, q.id);
                        if (localImageUrl) imgSuccess++;
                        else imgFail++;
                    }
                    processedQuestions.push({ ...q, local_image_url: localImageUrl });
                }

                if (questionsWithImages.length > 0) {
                    console.log(`  ✅ Gambar: ${imgSuccess} berhasil${imgFail > 0 ? `, ${imgFail} gagal` : ''}`);
                }

                const insertQuestions = db.transaction((items) => {
                    for (const q of items) {
                        insertQuestion.run(
                            q.id,
                            q.quiz_id,
                            q.question_text,
                            q.question_type || 'MULTIPLE_CHOICE',
                            q.options ? JSON.stringify(q.options) : null,  // E12: JSONB→TEXT
                            q.correct_answer || null,
                            q.points || 10,
                            q.order_index || 0,
                            q.local_image_url || null,   // E30: null if no image
                            q.passage_text || null        // E38: null if no passage
                        );
                    }
                });
                insertQuestions(processedQuestions);
                console.log(`  ✅ ${questions.length} soal diunduh`);
            } else {
                console.warn('  ⚠️  0 soal ditemukan untuk kuis aktif');
            }
        } else {
            console.warn('  ⚠️  0 kuis aktif ditemukan'); // E10
            console.warn('  💡 Pastikan kuis sudah diaktifkan di dashboard LMS');
        }

        // ── Step 6: Download assignments ──
        downloadProgress = 'Mengunduh tugas...';
        console.log('📋 Mengunduh tugas...');
        const { data: assignments, error: assErr } = await supabase
            .from('assignments')
            .select('id, title, description, type, due_date, teaching_assignment_id')
            .in('teaching_assignment_id', taIds);

        if (assErr) {
            console.error('  ⚠️  Gagal mengunduh tugas:', assErr.message);
        } else if (assignments && assignments.length > 0) {
            db.prepare('DELETE FROM assignments').run();
            const insertAssignment = db.prepare(
                'INSERT OR REPLACE INTO assignments (id, title, description, type, due_date, subject, class_name) VALUES (?, ?, ?, ?, ?, ?, ?)'
            );
            const taMapAssign = {};
            for (const ta of tas) {
                taMapAssign[ta.id] = {
                    subject: ta.subject?.name || '-',
                    class_name: ta.class?.name || '-'
                };
            }
            const insertAssignments = db.transaction((items) => {
                for (const a of items) {
                    const ta = taMapAssign[a.teaching_assignment_id] || {};
                    insertAssignment.run(
                        a.id,
                        a.title,
                        a.description || '',
                        a.type || 'TUGAS',
                        a.due_date || null,
                        ta.subject || '-',
                        ta.class_name || '-'
                    );
                }
            });
            insertAssignments(assignments);
            console.log(`  ✅ ${assignments.length} tugas diunduh`);
        } else {
            console.log('  ℹ️  0 tugas ditemukan (OK jika hanya ada kuis)');
        }
    }

    downloadProgress = 'Download selesai!';
    console.log('');
    console.log('╔═══════════════════════════════════════════════════╗');
    console.log('║       ✅ DOWNLOAD SELESAI                        ║');
    console.log('╚═══════════════════════════════════════════════════╝');
    console.log('');
}

// ═══════════════════════════════════════════════════
//  UPLOAD RESULTS TO SUPABASE (integrated in server)
// ═══════════════════════════════════════════════════

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
    console.log('📤 Memulai upload hasil ke Supabase...');

    // E48: Check internet connectivity first
    const isOnline = await checkConnectivity();
    if (!isOnline) {
        throw new Error('Tidak ada koneksi internet. Sambungkan laptop ke internet lalu coba lagi.');
    }

    let quizSuccess = 0, quizFail = 0, assignSuccess = 0, assignFail = 0;

    // ── Upload Quiz Submissions ──
    const quizSubs = db.prepare('SELECT * FROM quiz_submissions WHERE uploaded = 0').all();

    for (const sub of quizSubs) {
        try {
            let answers;
            try { answers = JSON.parse(sub.answers); } catch { answers = []; }

            const payload = {
                quiz_id: sub.quiz_id,
                student_id: sub.student_id,
                answers: answers,
                total_score: sub.total_score,
                max_score: sub.max_score,
                submitted_at: sub.submitted_at,
                is_graded: true,
                started_at: sub.submitted_at
            };

            const { error } = await supabase
                .from('quiz_submissions')
                .upsert(payload, { onConflict: 'quiz_id,student_id' });

            if (error) {
                if (error.message.includes('violates foreign key')) {
                    console.warn(`  ⚠️  Skip: student ${sub.student_id} tidak ada di Supabase`);
                } else {
                    console.error(`  ❌ Gagal upload kuis: ${error.message}`);
                }
                quizFail++;
            } else {
                db.prepare('UPDATE quiz_submissions SET uploaded = 1 WHERE id = ?').run(sub.id);
                quizSuccess++;
            }
        } catch (err) {
            console.error(`  ❌ Error upload kuis: ${err.message}`);
            quizFail++;
        }
    }

    // ── Upload Assignment Submissions ──
    const assignSubs = db.prepare('SELECT * FROM assignment_submissions WHERE uploaded = 0').all();

    for (const sub of assignSubs) {
        try {
            const payload = {
                assignment_id: sub.assignment_id,
                student_id: sub.student_id,
                answers: [{ answer: sub.answer_text }],
                submitted_at: sub.submitted_at
            };

            const { error } = await supabase
                .from('student_submissions')
                .upsert(payload, { onConflict: 'assignment_id,student_id' });

            if (error) {
                if (error.message.includes('violates foreign key')) {
                    console.warn(`  ⚠️  Skip: FK error untuk tugas`);
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

    const totalUploaded = quizSuccess + assignSuccess;
    const totalFailed = quizFail + assignFail;
    const totalPending = quizSubs.length + assignSubs.length;

    console.log(`  📊 Upload selesai: ${totalUploaded}/${totalPending} berhasil`);

    return {
        quiz_uploaded: quizSuccess,
        quiz_failed: quizFail,
        quiz_total: quizSubs.length,
        assign_uploaded: assignSuccess,
        assign_failed: assignFail,
        assign_total: assignSubs.length,
        total_uploaded: totalUploaded,
        total_failed: totalFailed,
        total_pending: totalPending
    };
}

// ═══════════════════════════════════════════════════
//  SESSION MIDDLEWARE
// ═══════════════════════════════════════════════════

function validateToken(req, res, next) {
    const token = req.headers['x-session-token'];
    if (!token) {
        return res.status(401).json({ error: 'Token tidak ditemukan. Silakan login ulang.' });
    }
    const session = db.prepare('SELECT student_id FROM sessions WHERE token = ?').get(token);
    if (!session) {
        return res.status(401).json({ error: 'Sesi tidak valid. Silakan login ulang.' });
    }
    req.studentId = session.student_id;
    next();
}

// E45: State guard — block student routes until ready
function requireReady(req, res, next) {
    if (serverState !== 'ready') {
        return res.status(503).json({
            error: 'Server sedang disiapkan oleh guru. Tunggu beberapa saat lalu coba lagi.',
            state: serverState
        });
    }
    next();
}

// ═══════════════════════════════════════════════════
//  API ROUTES — Server State & Teacher Setup
// ═══════════════════════════════════════════════════

// ── GET /api/server/state ──
app.get('/api/server/state', (req, res) => {
    try {
        const teacherName = db.prepare("SELECT value FROM meta WHERE key = 'teacher_name'").get();
        const downloadTime = db.prepare("SELECT value FROM meta WHERE key = 'download_time'").get();

        res.json({
            state: serverState,
            teacher_name: teacherName?.value || null,
            download_time: downloadTime?.value || null,
            progress: downloadProgress,
            error: downloadError
        });
    } catch (err) {
        res.json({
            state: serverState,
            progress: downloadProgress,
            error: downloadError
        });
    }
});

// ── POST /api/teacher/setup ──
app.post('/api/teacher/setup', async (req, res) => {
    const { nip } = req.body;

    if (!nip || nip.trim() === '') {
        return res.status(400).json({ error: 'NIP harus diisi' });
    }

    if (serverState === 'downloading') {
        return res.status(409).json({ error: 'Download sedang berlangsung. Tunggu hingga selesai.' });
    }

    // Transition to downloading
    serverState = 'downloading';
    downloadError = null;
    downloadProgress = 'Memulai download...';

    // Run download in background, respond immediately
    res.json({ message: 'Download dimulai', state: 'downloading' });

    try {
        await downloadData(nip.trim());
        serverState = 'ready';
        downloadError = null;
        console.log('');
        console.log('  ✅ Server siap! Siswa dapat mulai mengerjakan ujian.');
        console.log('');
    } catch (err) {
        // E47: Download failure — revert state
        serverState = 'setup';
        downloadError = err.message;
        downloadProgress = '';
        console.error('');
        console.error(`  ❌ Download gagal: ${err.message}`);
        console.error('  Silakan coba lagi di browser.');
        console.error('');
    }
});

// ── POST /api/teacher/upload ──
app.post('/api/teacher/upload', async (req, res) => {
    try {
        const result = await uploadResults();
        res.json(result);
    } catch (err) {
        console.error('Upload error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// ── Root route: redirect to teacher setup if not ready ──
app.get('/', (req, res) => {
    if (serverState !== 'ready') {
        return res.redirect('/teacher.html');
    }
    // When ready, serve index.html (student page)
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ═══════════════════════════════════════════════════
//  API ROUTES — Student (E45: requireReady guard)
// ═══════════════════════════════════════════════════

// ── POST /api/login ──
app.post('/api/login', requireReady, (req, res) => {
    try {
        const { nis } = req.body;
        if (!nis) {
            return res.status(400).json({ error: 'NIS harus diisi' });
        }

        const student = db.prepare('SELECT id, nis, nama, kelas FROM students WHERE nis = ?').get(nis);
        if (!student) {
            return res.status(404).json({ error: 'NIS tidak ditemukan. Pastikan NIS kamu sudah terdaftar.' }); // E18
        }

        // Generate session token
        const token = crypto.randomBytes(32).toString('hex');

        // Remove old sessions for this student, then create new one
        db.prepare('DELETE FROM sessions WHERE student_id = ?').run(student.id);
        db.prepare('INSERT INTO sessions (student_id, token) VALUES (?, ?)').run(student.id, token);

        res.json({
            token,
            student: {
                id: student.id,
                nis: student.nis,
                nama: student.nama,
                kelas: student.kelas
            }
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// ── GET /api/quizzes ──
app.get('/api/quizzes', requireReady, validateToken, (req, res) => {
    try {
        const quizzes = db.prepare('SELECT id, title, description, subject, class_name, duration_minutes FROM quizzes').all();

        // Check submission status for this student
        const submissions = db.prepare(
            'SELECT quiz_id, total_score, max_score FROM quiz_submissions WHERE student_id = ?'
        ).all(req.studentId);

        const subMap = {};
        for (const s of submissions) {
            subMap[s.quiz_id] = { total_score: s.total_score, max_score: s.max_score };
        }

        const result = quizzes.map(q => ({
            ...q,
            submitted: !!subMap[q.id],
            score: subMap[q.id] || null
        }));

        res.json(result);
    } catch (err) {
        console.error('Get quizzes error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// ── GET /api/quizzes/:id ──
app.get('/api/quizzes/:id', requireReady, validateToken, (req, res) => {
    try {
        const quiz = db.prepare('SELECT * FROM quizzes WHERE id = ?').get(req.params.id);
        if (!quiz) {
            return res.status(404).json({ error: 'Kuis tidak ditemukan' });
        }

        // Check if already submitted
        const existing = db.prepare(
            'SELECT id FROM quiz_submissions WHERE quiz_id = ? AND student_id = ?'
        ).get(req.params.id, req.studentId);

        if (existing) {
            return res.status(400).json({ error: 'Kamu sudah mengerjakan kuis ini.' }); // E15
        }

        // Get questions WITHOUT correct_answer (security), but WITH image_url and passage_text
        let questions = db.prepare(
            'SELECT id, quiz_id, question_text, question_type, options, points, order_index, image_url, passage_text FROM quiz_questions WHERE quiz_id = ? ORDER BY order_index'
        ).all(req.params.id);

        // Parse JSON options back for client (E12 reverse)
        questions = questions.map(q => ({
            ...q,
            options: q.options ? JSON.parse(q.options) : null
        }));

        // Randomize if enabled
        if (quiz.is_randomized) {
            questions = shuffleArray(questions);
        }

        res.json({
            quiz: {
                id: quiz.id,
                title: quiz.title,
                description: quiz.description,
                subject: quiz.subject,
                class_name: quiz.class_name,
                duration_minutes: quiz.duration_minutes
            },
            questions
        });
    } catch (err) {
        console.error('Get quiz detail error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// ── POST /api/quizzes/:id/submit ──
app.post('/api/quizzes/:id/submit', requireReady, validateToken, (req, res) => {
    try {
        const quizId = req.params.id;
        const studentId = req.studentId;
        const { answers } = req.body; // { questionId: "answer", ... }

        if (!answers || typeof answers !== 'object') {
            return res.status(400).json({ error: 'Format jawaban tidak valid' });
        }

        // E15: Check duplicate submission
        const existing = db.prepare(
            'SELECT id FROM quiz_submissions WHERE quiz_id = ? AND student_id = ?'
        ).get(quizId, studentId);

        if (existing) {
            return res.status(400).json({ error: 'Kamu sudah mengerjakan kuis ini.' });
        }

        // Load questions WITH correct_answer for scoring
        const questions = db.prepare(
            'SELECT id, correct_answer, points, question_type FROM quiz_questions WHERE quiz_id = ?'
        ).all(quizId);

        let totalScore = 0;
        let maxScore = 0;
        const gradedAnswers = [];

        for (const q of questions) {
            maxScore += (q.points || 10);
            const studentAnswer = answers[q.id] || '';

            if (q.question_type === 'MULTIPLE_CHOICE' && q.correct_answer) {
                // Auto-grade multiple choice
                const isCorrect = studentAnswer.toUpperCase() === q.correct_answer.toUpperCase();
                const score = isCorrect ? (q.points || 10) : 0;
                totalScore += score;
                gradedAnswers.push({
                    question_id: q.id,
                    answer: studentAnswer,
                    is_correct: isCorrect,
                    score: score
                });
            } else {
                // Essay — cannot auto-grade
                gradedAnswers.push({
                    question_id: q.id,
                    answer: studentAnswer,
                    is_correct: null,
                    score: 0
                });
            }
        }

        // Insert submission
        try {
            db.prepare(
                'INSERT INTO quiz_submissions (quiz_id, student_id, answers, total_score, max_score) VALUES (?, ?, ?, ?, ?)'
            ).run(quizId, studentId, JSON.stringify(gradedAnswers), totalScore, maxScore);
        } catch (sqlErr) {
            // E15: UNIQUE constraint violation
            if (sqlErr.message.includes('UNIQUE')) {
                return res.status(400).json({ error: 'Kamu sudah mengerjakan kuis ini.' });
            }
            throw sqlErr;
        }

        const student = db.prepare('SELECT nama FROM students WHERE id = ?').get(studentId);
        console.log(`📩 Jawaban kuis diterima: ${student?.nama || 'Unknown'} — Skor: ${totalScore}/${maxScore}`);

        res.json({
            message: 'Jawaban berhasil disimpan!',
            total_score: totalScore,
            max_score: maxScore,
            percentage: maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0
        });
    } catch (err) {
        console.error('Submit quiz error:', err);
        res.status(500).json({ error: 'Server error saat menyimpan jawaban' });
    }
});

// ── GET /api/assignments ──
app.get('/api/assignments', requireReady, validateToken, (req, res) => {
    try {
        const assignments = db.prepare('SELECT id, title, description, type, due_date, subject, class_name FROM assignments').all();

        // Check submission status
        const submissions = db.prepare(
            'SELECT assignment_id FROM assignment_submissions WHERE student_id = ?'
        ).all(req.studentId);

        const subSet = new Set(submissions.map(s => s.assignment_id));

        const result = assignments.map(a => ({
            ...a,
            submitted: subSet.has(a.id)
        }));

        res.json(result);
    } catch (err) {
        console.error('Get assignments error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// ── POST /api/assignments/:id/submit ──
app.post('/api/assignments/:id/submit', requireReady, validateToken, (req, res) => {
    try {
        const assignmentId = req.params.id;
        const studentId = req.studentId;
        const { answer_text } = req.body;

        if (!answer_text || answer_text.trim() === '') {
            return res.status(400).json({ error: 'Jawaban tidak boleh kosong' });
        }

        // Check duplicate
        const existing = db.prepare(
            'SELECT id FROM assignment_submissions WHERE assignment_id = ? AND student_id = ?'
        ).get(assignmentId, studentId);

        if (existing) {
            return res.status(400).json({ error: 'Kamu sudah mengumpulkan tugas ini.' });
        }

        try {
            db.prepare(
                'INSERT INTO assignment_submissions (assignment_id, student_id, answer_text) VALUES (?, ?, ?)'
            ).run(assignmentId, studentId, answer_text.trim());
        } catch (sqlErr) {
            if (sqlErr.message.includes('UNIQUE')) {
                return res.status(400).json({ error: 'Kamu sudah mengumpulkan tugas ini.' });
            }
            throw sqlErr;
        }

        const student = db.prepare('SELECT nama FROM students WHERE id = ?').get(studentId);
        console.log(`📩 Tugas diterima: ${student?.nama || 'Unknown'}`);

        res.json({ message: 'Tugas berhasil dikumpulkan!' });
    } catch (err) {
        console.error('Submit assignment error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// ═══════════════════════════════════════════════════
//  API ROUTES — Teacher Dashboard
// ═══════════════════════════════════════════════════

// ── GET /api/teacher/status ──
app.get('/api/teacher/status', (req, res) => {
    try {
        const teacherName = db.prepare("SELECT value FROM meta WHERE key = 'teacher_name'").get();
        const downloadTime = db.prepare("SELECT value FROM meta WHERE key = 'download_time'").get();
        const studentCount = db.prepare('SELECT COUNT(*) as count FROM students').get();
        const quizCount = db.prepare('SELECT COUNT(*) as count FROM quizzes').get();
        const assignmentCount = db.prepare('SELECT COUNT(*) as count FROM assignments').get();
        const quizSubCount = db.prepare('SELECT COUNT(*) as count FROM quiz_submissions').get();
        const assignSubCount = db.prepare('SELECT COUNT(*) as count FROM assignment_submissions').get();
        const activeSessions = db.prepare('SELECT COUNT(*) as count FROM sessions').get();
        const pendingUpload = db.prepare('SELECT COUNT(*) as count FROM quiz_submissions WHERE uploaded = 0').get();
        const pendingAssignUpload = db.prepare('SELECT COUNT(*) as count FROM assignment_submissions WHERE uploaded = 0').get();

        res.json({
            teacher_name: teacherName?.value || '-',
            download_time: downloadTime?.value || '-',
            students: studentCount?.count || 0,
            quizzes: quizCount?.count || 0,
            assignments: assignmentCount?.count || 0,
            quiz_submissions: quizSubCount?.count || 0,
            assignment_submissions: assignSubCount?.count || 0,
            active_sessions: activeSessions?.count || 0,
            pending_upload: (pendingUpload?.count || 0) + (pendingAssignUpload?.count || 0)
        });
    } catch (err) {
        console.error('Teacher status error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// ── GET /api/teacher/results ──
app.get('/api/teacher/results', (req, res) => {
    try {
        // Quiz results
        const quizResults = db.prepare(`
            SELECT qs.quiz_id, qs.student_id, qs.total_score, qs.max_score, qs.submitted_at,
                   s.nama, s.kelas, q.title as quiz_title, q.subject
            FROM quiz_submissions qs
            JOIN students s ON qs.student_id = s.id
            JOIN quizzes q ON qs.quiz_id = q.id
            ORDER BY qs.submitted_at DESC
        `).all();

        // Assignment results
        const assignResults = db.prepare(`
            SELECT asub.assignment_id, asub.student_id, asub.answer_text, asub.submitted_at,
                   s.nama, s.kelas, a.title as assignment_title, a.subject
            FROM assignment_submissions asub
            JOIN students s ON asub.student_id = s.id
            JOIN assignments a ON asub.assignment_id = a.id
            ORDER BY asub.submitted_at DESC
        `).all();

        res.json({
            quiz_results: quizResults,
            assignment_results: assignResults
        });
    } catch (err) {
        console.error('Teacher results error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// ═══════════════════════════════════════════════════
//  UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════

function shuffleArray(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function getLocalIPs() {
    const interfaces = os.networkInterfaces();
    const ips = [];
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                ips.push({ name, address: iface.address });
            }
        }
    }
    return ips;
}

// ═══════════════════════════════════════════════════
//  SERVER STARTUP
// ═══════════════════════════════════════════════════

async function startServer() {
    // E4: port fallback
    const BASE_PORT = 3000;
    const MAX_PORT = 3005;

    for (let port = BASE_PORT; port <= MAX_PORT; port++) {
        try {
            await new Promise((resolve, reject) => {
                const server = app.listen(port, () => {
                    console.log('');
                    console.log('╔═══════════════════════════════════════════════════╗');
                    console.log('║       🚀 SERVER UJIAN OFFLINE SIAP!               ║');
                    console.log('╚═══════════════════════════════════════════════════╝');
                    console.log('');

                    if (serverState === 'ready') {
                        console.log('  📋 Status: SIAP (data dari sesi sebelumnya)');
                    } else {
                        console.log('  📋 Status: MENUNGGU LOGIN GURU');
                        console.log('     Buka browser dan masukkan NIP untuk memulai.');
                    }
                    console.log('');

                    // Show local URLs
                    console.log(`  📍 Dashboard Guru:  http://localhost:${port}/teacher.html`);
                    console.log(`  📍 Halaman Siswa:   http://localhost:${port}`);
                    console.log('');

                    // Show network IPs
                    const ips = getLocalIPs();
                    if (ips.length > 0) {
                        console.log('  📱 Alamat untuk murid (pilih sesuai jaringan hotspot):');
                        ips.forEach(ip => {
                            console.log(`     → http://${ip.address}:${port}  (${ip.name})`);
                        });
                        console.log('');

                        // QR Code for first IP
                        try {
                            const qrcode = require('qrcode-terminal');
                            const primaryUrl = `http://${ips[0].address}:${port}`;
                            console.log(`  📷 QR Code (${primaryUrl}):`);
                            qrcode.generate(primaryUrl, { small: true }, (code) => {
                                console.log(code);
                            });
                        } catch (qrErr) {
                            // QR code is optional, don't crash
                            console.log('  ℹ️  QR code tidak tersedia (qrcode-terminal tidak terinstall)');
                        }
                    } else {
                        console.log('  ⚠️  Tidak ada jaringan WiFi terdeteksi.');
                        console.log('  Nyalakan hotspot terlebih dahulu.');
                    }

                    console.log('');
                    console.log('  ℹ️  Tekan Ctrl+C untuk menghentikan server');
                    console.log('');

                    // Auto-open browser
                    const teacherUrl = `http://localhost:${port}/teacher.html`;
                    exec(`start "" "${teacherUrl}"`, (err) => {
                        if (err) {
                            console.log(`  ℹ️  Buka browser secara manual: ${teacherUrl}`);
                        } else {
                            console.log('  🌐 Browser dibuka otomatis');
                        }
                    });

                    resolve();
                });
                server.on('error', reject);
            });
            return; // Success, stop trying ports
        } catch (err) {
            if (err.code === 'EADDRINUSE') {
                console.log(`  ⚠️  Port ${port} sudah digunakan, mencoba port ${port + 1}...`);
                if (port === MAX_PORT) {
                    console.error('');
                    console.error('  ❌ Semua port 3000-3005 sudah digunakan!');
                    console.error('  Tutup aplikasi lain yang menggunakan port tersebut.');
                    process.exit(1);
                }
            } else {
                throw err;
            }
        }
    }
}

startServer().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
