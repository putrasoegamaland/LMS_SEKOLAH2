const fs = require('fs');

async function checkWali() {
    const envFile = fs.readFileSync('.env.local', 'utf8');
    const env = {};
    envFile.split('\n').forEach(line => {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) env[match[1]] = match[2];
    });

    const url = `${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/users?select=username,role`;
    const response = await fetch(url, {
        headers: {
            'apikey': env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
        }
    });

    const data = await response.json();
    console.log(data.filter(u => u.username && u.username.includes('.wali')));
}

checkWali().catch(console.error);
