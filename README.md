# Monitoring Pekerjaan — Setup

## 1. Salin file environment
Duplikat file `.env.local.example` menjadi `.env.local` (isinya sudah benar, tidak perlu diubah kecuali key Supabase kamu berganti).

## 2. Buat storage bucket untuk foto
Di Supabase dashboard:
1. Buka menu **Storage** di sidebar kiri
2. Klik **New bucket**
3. Nama: `bukti-foto`
4. Aktifkan **Public bucket** (supaya foto bisa ditampilkan di aplikasi)
5. Klik **Create bucket**

## 3. Hubungkan akun testing kamu ke tabel users
Karena kamu sudah bikin akun `utility@monitoring-wo.local` lewat Supabase Auth, sekarang hubungkan ke salah satu baris di tabel `users`:

1. Buka **Authentication → Users** di Supabase, cari akun `utility`, copy **User UID**-nya
2. Buka **Table Editor → users**
3. Pilih baris admin (misal "Ghifari"), isi kolom `auth_id` dengan UID yang barusan di-copy
4. Save

## 4. Jalankan di komputer kamu (opsional, untuk cek dulu sebelum deploy)
Kalau kamu punya Node.js terinstal, buka folder ini lewat terminal / VS Code:
```
npm install
npm run dev
```
Lalu buka `http://localhost:3000` di browser.

Kalau tidak familiar dengan ini, lewati saja — langsung ke langkah 5 (deploy ke Vercel), nanti tetap bisa dicoba dari sana.

## 5. Push ke GitHub
Di GitHub Desktop:
1. Pastikan semua file project ini sudah ada di folder repo `monitoring-wo` kamu
2. Isi kolom **Summary**, misal "Setup awal aplikasi"
3. Klik **Commit to main**
4. Klik **Push origin** (atau **Publish repository** kalau ini push pertama)

## 6. Deploy ke Vercel
1. Buka [vercel.com](https://vercel.com), login pakai akun GitHub
2. Klik **Add New → Project**
3. Pilih repo `monitoring-wo`
4. Di bagian **Environment Variables**, tambahkan:
   - `NEXT_PUBLIC_SUPABASE_URL` = (isi dari .env.local)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = (isi dari .env.local)
5. Klik **Deploy**

Setelah selesai, Vercel kasih link seperti `monitoring-wo.vercel.app` — itu link aplikasi kamu yang sudah live.
