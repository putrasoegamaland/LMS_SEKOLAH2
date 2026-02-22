/**
 * db.js — SQLite Database Adapter
 * Creates and manages the local offline.db database
 * 
 * Error mitigations:
 * - E2:  Wraps DB open in try/catch for better-sqlite3 issues
 * - E12: Handles JSONB→TEXT conversion notes in schema
 * - E16: Enables WAL mode for concurrent read access
 * - E25: Graceful error if DB file is locked
 * - E42: ALTER TABLE migration for existing DBs missing new columns
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Ensure data directory exists (E24: use path.join for Windows compat)
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'offline.db');

let db;

try {
    db = new Database(DB_PATH);
    // E16: Enable WAL mode for better concurrent read performance
    db.pragma('journal_mode = WAL');
    db.pragma('busy_timeout = 5000');
} catch (err) {
    // E2: better-sqlite3 native module issue
    // E25: DB file locked by another process
    console.error('');
    console.error('═══════════════════════════════════════════════════');
    console.error('  ❌ GAGAL MEMBUKA DATABASE');
    console.error('═══════════════════════════════════════════════════');
    if (err.message.includes('locked')) {
        console.error('  Database sedang digunakan proses lain.');
        console.error('  Tutup semua server offline lalu coba lagi.');
    } else if (err.message.includes('Cannot find module') || err.message.includes('NODE_MODULE_VERSION')) {
        console.error('  Module better-sqlite3 tidak kompatibel.');
        console.error('  Jalankan: npm rebuild better-sqlite3');
        console.error('  Atau reinstall: npm install');
    } else {
        console.error('  ' + err.message);
    }
    console.error('═══════════════════════════════════════════════════');
    process.exit(1);
}

// ─── Create Tables (all use IF NOT EXISTS for safety) ───

db.exec(`
    CREATE TABLE IF NOT EXISTS students (
        id TEXT PRIMARY KEY,
        nis TEXT UNIQUE,
        nama TEXT NOT NULL,
        kelas TEXT
    );

    CREATE TABLE IF NOT EXISTS quizzes (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        subject TEXT,
        class_name TEXT,
        duration_minutes INTEGER DEFAULT 30,
        is_randomized INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS quiz_questions (
        id TEXT PRIMARY KEY,
        quiz_id TEXT NOT NULL,
        question_text TEXT NOT NULL,
        question_type TEXT DEFAULT 'MULTIPLE_CHOICE',
        options TEXT,
        correct_answer TEXT,
        points INTEGER DEFAULT 10,
        order_index INTEGER DEFAULT 0,
        image_url TEXT,
        passage_text TEXT,
        FOREIGN KEY (quiz_id) REFERENCES quizzes(id)
    );

    CREATE TABLE IF NOT EXISTS assignments (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        type TEXT DEFAULT 'TUGAS',
        due_date TEXT,
        subject TEXT,
        class_name TEXT
    );

    CREATE TABLE IF NOT EXISTS quiz_submissions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        quiz_id TEXT NOT NULL,
        student_id TEXT NOT NULL,
        answers TEXT,
        total_score INTEGER DEFAULT 0,
        max_score INTEGER DEFAULT 0,
        submitted_at TEXT DEFAULT (datetime('now', 'localtime')),
        uploaded INTEGER DEFAULT 0,
        UNIQUE(quiz_id, student_id)
    );

    CREATE TABLE IF NOT EXISTS assignment_submissions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        assignment_id TEXT NOT NULL,
        student_id TEXT NOT NULL,
        answer_text TEXT,
        submitted_at TEXT DEFAULT (datetime('now', 'localtime')),
        uploaded INTEGER DEFAULT 0,
        UNIQUE(assignment_id, student_id)
    );

    CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id TEXT NOT NULL,
        token TEXT UNIQUE NOT NULL,
        created_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS meta (
        key TEXT PRIMARY KEY,
        value TEXT
    );
`);

// ─── E42: Migrate existing databases — add new columns if missing ───
const migrations = [
    { table: 'quiz_questions', column: 'image_url', type: 'TEXT' },
    { table: 'quiz_questions', column: 'passage_text', type: 'TEXT' },
];
for (const m of migrations) {
    try {
        db.exec(`ALTER TABLE ${m.table} ADD COLUMN ${m.column} ${m.type}`);
    } catch (e) {
        // Column already exists — safe to ignore
    }
}

// ─── Create indexes for performance ───
db.exec(`
    CREATE INDEX IF NOT EXISTS idx_quiz_questions_quiz ON quiz_questions(quiz_id);
    CREATE INDEX IF NOT EXISTS idx_quiz_submissions_quiz ON quiz_submissions(quiz_id);
    CREATE INDEX IF NOT EXISTS idx_quiz_submissions_student ON quiz_submissions(student_id);
    CREATE INDEX IF NOT EXISTS idx_assignment_submissions_assignment ON assignment_submissions(assignment_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
    CREATE INDEX IF NOT EXISTS idx_students_nis ON students(nis);
`);

module.exports = db;
