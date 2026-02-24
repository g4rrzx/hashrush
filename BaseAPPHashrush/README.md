# 🤖 HashRush Automation Bot

Bot ini dirancang untuk melakukan **Transaksi Onchain Otomatis** di aplikasi HashRush agara tercatat di **Base Builder Rewards**.

## 🎯 Fitur & Kemampuan

| Fitur | Status | Keterangan |
| :--- | :---: | :--- |
| **Onchain Transactions** | ✅ | Meningkatkan "Total Transactions" & "Active Users" di Base Analytics. |
| **Builder Code Loyalty** | ✅ | Setiap transaksi membawa kode `bc_8io601u8` agar terhitung reward. |
| **Humanized** | ✅ | Delay acak, Jumlah poin acak, Urutan akun acak. |
| **Safety** | ✅ | Skip akun jika Gas Fee > $0.0008 (Hemat biaya). |
| **App Opens / Views** | ❌ | **TIDAK BISA.** (Lihat penjelasan di bawah). |

---

## ⚠️ Tentang Statistik "App Opens" (Offchain)

Kamu bertanya: *"Biar statistik mini apps (App Opens) kebaca di Base App gimana?"*

Jawabannya: **Bot ini TIDAK BISA memalsukan "App Opens" atau "Views" di Dashboard Base App.**

**Alasannya:**
1.  **Tracking Client-Side:** Statistik "Entry Points" (Home, Search, Feed) yang kamu lihat di screenshot itu dilacak langsung oleh **Aplikasi Mobile Base** (Android/iOS).
2.  **Autentikasi Tertutup:** Untuk dihitung sebagai "App Open", user harus login ke aplikasi Base asli dan membuka Mini App dari sana. Script kita hanya berinteraksi dengan Blockchain, tidak login ke aplikasi Base.
3.  **Tidak Penting untuk Reward:** Kabar baiknya, **Builder Rewards** (Uang-nya) biasanya berbasis **Volume Transaksi Onchain (Gas Spent)**, bukan berapa kali aplikasi dibuka. Jadi fokus ke Onchain (yang dilakukan bot ini) sudah benar untuk tujuan finansial.

---

## 🚀 Cara Menjalankan

### 1. Persiapan
Pastikan sudah install Node.js.
Masuk ke folder bot:
```bash
cd BaseAPPHashrush
npm install
```

### 2. Isi Akun
Buka file `data/privateKeys.txt` dan masukkan Private Key akun-akun kamu (satu per baris).
*   Pastikan akun memiliki sedikit ETH Base (min $0.05 untuk aman).

### 3. Jalankan
```bash
npm start
```

## ⚙️ Konfigurasi (`src/config.js`)
Kamu bisa mengubah setting di file `src/config.js`:
*   `SLEEP_MIN` / `SLEEP_MAX`: Mengatur kecepatan bot (Delay).
*   `MAX_FEE_USD`: Batas maksimal harga gas yang mau dibayar.
