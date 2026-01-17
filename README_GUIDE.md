# HashRush Mini-App Guide

Hi Boss! Aplikasi "CryptoMiner" telah berevolusi menjadi **"HashRush"**.
Ini adalah aplikasi Frame v2 (Mini-App) dengan fitur Mining Simulator, Store (Upgrade), dan Tasks.

## 1. Lokasi Project
Project ada di folder:
`c:\Users\USER\Documents\BOT\LikeFarcast\miniApps\cryptominer`

## 2. Fitur Utama
- **Mining**: Auto-generate points (hashes) per detik.
- **Store**: User bisa membeli item (GPU, Rig) menggunakan ETH (simulasi fee/transfer).
- **Tasks**: Check simple tasks (Follow/Cast) untuk boost speed.
- **Save Point**: User harus membayar network fee (send 0.0001 ETH) untuk menyimpan poin mereka ke "Cloud/Wallet" dan mendapatkan tiket lotre.

## 3. Smart Contract
File kontrak Solidity ada di: `contracts/HashRush.sol`.
Kontrak ini berfungsi untuk:
1. Menerima pembayaran pembelian Item.
2. Menerima fee saat Claim.
3. Fungsi `withdraw` untuk menarik semua ETH ke wallet owner.

### Cara Deploy (Opsional)
Jika kamu ingin menggunakan Smart Contract beneran:
1. Install Hardhat: `npm install --save-dev hardhat`
2. Konfigurasi `hardhat.config.js` dengan Private Key kamu (dari .env).
3. Jalankan `npx hardhat run scripts/deploy.js --network base`.
4. Copy Address kontrak baru ke file `src/app/page.tsx` di variabel `CONTRACT_ADDRESS`.
5. Set `USE_SMART_CONTRACT = true` di `src/app/page.tsx`.

## 4. Cara Menjalankan
Buka terminal dan jalankan:
```bash
npm run dev
```
Akses di `http://localhost:3000`.

## 5. Deployment Production
Gunakan Vercel untuk hosting Frontend.
Gunakan Hardhat/Foundry untuk deploy Contract ke Base Mainnet.

Happy Farming "Transaction Fees"! 🚀
