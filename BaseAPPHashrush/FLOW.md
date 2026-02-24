# Alur Kerja Bot Otomatisasi HashRush (BaseAPPHashrush)

Tujuan: Mengotomatiskan transaksi on-chain untuk meningkatkan statistik "Total Transactions" dan "Transacting Users" di Base Analytics agar memenuhi syarat reward Builder Codes.

## Konsep Dasar

System Base Analytics melacak dua jenis data:
1.  **Onchain (Penting untuk Reward):** Transaksi yang terjadi di blockchain. Ini **BISA** kita otomatisasi dengan mudah menggunakan script (Bot). Syarat kuncinya adalah setiap transaksi **harus** mengandung `Builder Code Suffix` di data-nya.
2.  **Offchain (App Opens/Sessions):** Statistik ini biasanya dilacak oleh aplikasi Base (Mobile App/Web) saat pengguna membuka interface. Script Node.js biasa **TIDAK** akan memicu ini kecuali kita menggunakan browser automation (Puppeteer) yang login ke wallet, yang jauh lebih rumit dan berat.
    *   *Saran:* Fokus kita adalah **Onchain Transactions** karena itulah yang menghitung volume reward.

## Alur Logika Bot (Script)

Kita akan membuat script Node.js sederhana tanpa browser, yang langsung berinteraksi dengan Blockchain Base.

### 1. Persiapan Data (`.env` / `private_keys.txt`)
Kita perlu daftar **Private Key** dari akun-akun Farcaster/Wallet kamu.
*   Format: List private key.

### 2. Koneksi ke Blockchain (RPC)
Script akan terhubung ke Base Mainnet menggunakan RPC Public atau Private (misal Alchemy/Infura) agar koneksi stabil.

### 3. Loop Eksekusi (Per Akun)
Script akan berjalan meloop setiap Private Key:
1.  **Load Wallet:** Mengubah Private Key menjadi Wallet Object.
2.  **Cek Saldo ETH:** Pastikan ada sedikit ETH (Base) untuk bayar gas fee (sangat murah, ~$0.01).
3.  **Construct Transaksi:**
    *   Kita pilih fungsi kontrak yang paling murah, misal `claimPoints(100)` atau `buyHardware` (jika saldo cukup).
    *   **PENTING:** Kita harus menambahkan `DATA_SUFFIX` (kode `bc_8io601u8` yang sudah di-encode) ke akhir data transaksi. Tanpa ini, transaksi berhasil tapi **TIDAK TERHITUNG** di statistik Base kamu.
4.  **Kirim Transaksi:** Broadcast ke jaringan Base.
5.  **Delay:** Tunggu waktu acak (misal 30-60 detik) sebelum lanjut ke akun berikutnya agar terlihat natural ("Humanize").

## Struktur Folder

```
BaseAPPHashrush/
├── data/
│   └── privateKeys.txt   # Daftar Private Key
├── src/
│   ├── config.js         # ABI Contract, Alamat Contract, Builder Code
│   └── main.js           # Logic utama (Loop & Transaksi)
├── package.json          # Dependencies (ethers, dotenv)
└── README.md             # Panduan
```

## Langkah Selanjutnya

Jika setuju dengan alur ini, saya akan:
1.  Setup folder dan install library (`ethers`).
2.  Buat script `main.js` yang sudah siap pakai.
3.  Kamu tinggal isi Private Key dan jalankan.
