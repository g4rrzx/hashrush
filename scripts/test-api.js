// Native fetch in Node 20+

const API_URL = 'http://37.114.34.131:3001';

async function testAPI() {
    console.log(`Testing API at ${API_URL}...`);

    // 1. Health Check
    try {
        const health = await fetch(`${API_URL}/health`);
        const healthData = await health.json();
        console.log('✅ Health Check:', healthData);
    } catch (e) {
        console.error('❌ Health Check Failed:', e.message);
        return;
    }

    // 2. Post Leaderboard Score (Dummy)
    const testUser = {
        fid: '999999',
        username: 'TestUser_VPS',
        score: 12345,
        tier: 'Gold'
    };

    try {
        const postRes = await fetch(`${API_URL}/api/leaderboard`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(testUser)
        });
        const postData = await postRes.json();
        console.log('✅ POST Leaderboard:', postData);
    } catch (e) {
        console.error('❌ POST Leaderboard Failed:', e.message);
    }

    // 3. Get Leaderboard
    try {
        const getRes = await fetch(`${API_URL}/api/leaderboard`);
        const getData = await getRes.json();
        console.log('✅ GET Leaderboard:', getData.length, 'players');
        console.log('First player:', getData[0]);
    } catch (e) {
        console.error('❌ GET Leaderboard Failed:', e.message);
    }
}

testAPI();
