const fs = require('fs');
const path = require('path');

async function testAPIs() {
    // 1. Read Secret
    const envPath = path.join(__dirname, '.env.local');
    const envContent = fs.readFileSync(envPath, 'utf8');
    const match = envContent.match(/EXTERNAL_API_SECRET=(.+)/);

    if (!match) {
        console.error('EXTERNAL_API_SECRET not found in .env.local');
        return;
    }

    const API_SECRET = match[1].trim();
    const BASE_URL = 'http://localhost:3000';

    console.log(`Using API Secret: ${API_SECRET.substring(0, 5)}...`);

    const endpoints = [
        '/api/external/teachers?limit=5',
        '/api/external/teaching-assignments?limit=5',
        '/api/external/kpi/content',
        '/api/external/kpi/grading?limit=10',
        '/api/external/kpi/student-performance'
    ];

    for (const endpoint of endpoints) {
        console.log(`\nTesting ${endpoint}...`);
        try {
            const res = await fetch(`${BASE_URL}${endpoint}`, {
                headers: {
                    'x-api-key': API_SECRET
                }
            });

            console.log(`Status: ${res.status}`);
            if (res.ok) {
                const text = await res.text();
                try {
                    const data = JSON.parse(text);
                    console.log('Response Preview:', JSON.stringify(data, null, 2).substring(0, 500) + '...');
                } catch (e) {
                    console.error('Failed to parse JSON:', e.message);
                    console.log('Raw Text (First 500 chars):', text.substring(0, 500));
                }
            } else {
                const err = await res.text();
                console.error('Error:', err);
            }
        } catch (error) {
            console.error('Fetch failed (Server might not be running):', error.message);
        }
    }
}

testAPIs();
