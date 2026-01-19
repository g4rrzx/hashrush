// Script to send reward update notification to all users
const API_URL = 'http://37.114.34.131:3001';

async function sendRewardNotification() {
    console.log('📢 Sending reward update notification to all users...\n');

    // Get all notification subscribers
    const res = await fetch(`${API_URL}/api/notifications`);
    const subscribers = await res.json();

    console.log(`Found ${subscribers.length} subscribers with notifications enabled.\n`);

    if (subscribers.length === 0) {
        console.log('No subscribers yet. Users need to enable notifications first.');
        return;
    }

    // Notification content
    const notification = {
        title: '🎉 Rewards Increased!',
        body: 'USDC rewards have been increased to 0.025 USDC per redeem! Start mining now!',
        targetUrl: 'https://hashrush.vercel.app'
    };

    let sentCount = 0;
    let failCount = 0;

    for (const user of subscribers) {
        try {
            const notifyRes = await fetch(user.url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    notificationId: `reward-update-${Date.now()}-${user.fid}`,
                    title: notification.title,
                    body: notification.body,
                    targetUrl: notification.targetUrl,
                    tokens: [user.token]
                })
            });

            if (notifyRes.ok) {
                sentCount++;
                console.log(`✅ Sent to FID ${user.fid}`);
            } else {
                failCount++;
                const errorText = await notifyRes.text();
                console.log(`❌ Failed FID ${user.fid}: ${errorText}`);
            }
        } catch (e) {
            failCount++;
            console.log(`❌ Error FID ${user.fid}: ${e.message}`);
        }
    }

    console.log(`\n📊 Summary:`);
    console.log(`   Sent: ${sentCount}`);
    console.log(`   Failed: ${failCount}`);
    console.log(`   Total: ${subscribers.length}`);
}

sendRewardNotification();
