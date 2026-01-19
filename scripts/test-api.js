// Delete test user from VPS database
const API_URL = 'http://37.114.34.131:3001';

async function deleteTestUser() {
    // We need to add a DELETE endpoint on VPS, or directly delete via SQL
    // For now, let's just verify what's in the leaderboard

    const res = await fetch(`${API_URL}/api/leaderboard`);
    const data = await res.json();
    console.log('Current leaderboard:');
    data.forEach((u, i) => {
        console.log(`${i + 1}. FID: ${u.fid} | ${u.name} | ${u.score} HP`);
    });
}

deleteTestUser();
