1. Edit file yang mau diubah
Misal edit 
page.tsx
, 
globals.css
, dll

2. Jalankan 3 command ini:
bash
# 1. Stage semua perubahan
git add .
# 2. Commit dengan pesan
git commit -m "Deskripsi perubahan"
# 3. Push ke GitHub
git push
Contoh:
Misalkan kamu ubah reward dari 0.01 USDC menjadi 0.02 USDC:

bash
git add .
git commit -m "Update reward to 0.02 USDC"
git push
⚡ Auto-Deploy di Vercel
Kalau sudah connect Vercel dengan GitHub:

Setiap git push → Vercel otomatis rebuild & deploy
Dalam 1-2 menit, website kamu sudah update!
📝 Tips Commit Message yang Baik:
Perubahan	Commit Message
Fix bug	git commit -m "Fix spin wheel animation"
Add feature	git commit -m "Add daily login calendar"
UI update	git commit -m "Improve balance card design"
Contract change	git commit -m "Update min HP to 3000"
⚠️ Catatan Penting:
Jangan commit file 
.env
 - sudah ada di .gitignore, jadi aman
Kalau ada conflict, pull dulu: git pull origin main
Kalau mau lihat status: git status
Sekarang, sudah buat repository hashrush di GitHub? Kalau sudah, jalankan:

bash
git push -u origin main