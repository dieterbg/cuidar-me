const url = 'https://cuidar-me-olive.vercel.app/api/process-queue';
const token = 'CuidarMeCronSecret123'; // As listed in VERCEL_DEPLOY.md

async function run() {
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const data = await res.json();
        console.log('Result:', data);
    } catch (err) {
        console.error('Error:', err);
    }
}
run();
