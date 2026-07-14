# UTILITY MONITORING SYSTEM — PROJECT KNOWLEDGE

> Dokumen ini digunakan sebagai konteks untuk AI assistant.
> Baca seluruh dokumen ini sebelum membantu pengembangan apapun.
> Jangan ubah fitur, alur, atau database yang sudah ada kecuali diminta eksplisit.

---

## 1. IDENTITAS PROYEK

| | |
|---|---|
| **Nama** | Utility Monitoring System |
| **Perusahaan** | OTTO (Ottopharm) |
| **Departemen** | Engineering Utility |
| **Tujuan** | Monitoring dan pelaporan Work Order (WO) harian tim utility |
| **Status** | Production — aplikasi aktif digunakan tim |

---

## 2. TECH STACK

| Layer | Teknologi |
|---|---|
| Frontend | Next.js 14 (App Router), React 18 |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| File Storage | Supabase Storage (bucket: `bukti-foto`) |
| Hosting | Vercel |
| Version Control | GitHub |
| UI Library | Custom CSS (globals.css), Recharts (chart) |
| Export | SheetJS (xlsx) |
| EXIF | exifr |

---

## 3. STRUKTUR FOLDER

```
monitoring-wo/
├── app/                          # Next.js App Router — halaman UI
│   ├── page.js                   # Halaman login
│   ├── layout.js                 # Root layout + favicon
│   ├── globals.css               # Global CSS dengan OTTO branding
│   ├── components/
│   │   └── Sidebar.js            # Sidebar navigasi (desktop) + bottom nav (mobile)
│   ├── admin/
│   │   ├── page.js               # Halaman admin: buat WO, kelola pelaksana, master data
│   │   ├── wa/page.js            # Generator pesan WhatsApp harian
│   │   └── wo/[id]/page.js       # Detail WO + approval + Photo Time Tracker
│   ├── dashboard/
│   │   └── page.js               # Dashboard KPI, chart status, chart kategori
│   └── lapor/
│       └── page.js               # Halaman pelaksana: lapor WO, history, buat WO
├── src/
│   ├── constants/
│   │   ├── statusConstants.js    # WO_STATUS, WO_SUMBER, WO_PERAN
│   │   ├── roleConstants.js      # USER_ROLE, WO_PRIORITAS, SHIFT_OPTIONS, WA_ROLES
│   │   ├── colorConstants.js     # BRAND_COLORS, CHART_COLORS, STATUS_BADGE_CLASS
│   │   └── index.js
│   └── utils/
│       ├── dateUtils.js          # formatDate, formatTime, formatDuration, toWIBISO, toLocalInput
│       ├── kpiUtils.js           # calculateKPI, getActualHours, formatPct, getPercentColor
│       ├── waUtils.js            # generatePesanWA
│       ├── exportUtils.js        # exportWorkOrdersToExcel, exportKPIToExcel, exportDataHarianToExcel
│       ├── imageUtils.js         # compressImage (client-side Canvas API)
│       ├── exifUtils.js          # readExifTakenAt (baca EXIF DateTimeOriginal)
│       └── index.js
├── lib/
│   └── supabase.js               # Supabase client + usernameToEmail()
├── public/
│   └── otto-logo.png
└── docs/
    ├── ProjectKnowledge.md       ← file ini
    ├── Architecture.md
    └── DatabaseRelation.md
```

---

## 4. BRANDING & UI

- **Warna primer:** `#8B1A1A` (merah tua OTTO)
- **Warna accent:** `#E07B2A` (orange)
- **Font:** System font stack
- **Layout:** Sidebar kiri (desktop) + bottom navigation (mobile)
- **Logo:** `/public/otto-logo.png`

---

## 5. ROLE & AUTENTIKASI

### Role

| Role | Akses |
|---|---|
| `admin` | Buat WO, approve/reject laporan, kelola master data, kelola user, dashboard, generator WA |
| `pelaksana` | Lapor WO yang ditugaskan, buat WO tidak terencana, lihat history WO |

### Sistem Login

- Tidak pakai email asli — pakai **alias Gmail**
- Format email: `lasehaghifari+{username}@gmail.com`
- Dikonversi oleh fungsi `usernameToEmail(username)` di `lib/supabase.js`
- Pelaksana login dengan **username + password** (tidak tahu ada email di baliknya)
- Fitur "Confirm email" di Supabase **harus dimatikan**

### Auth Flow

```
Login page (/):
  → supabase.auth.signInWithPassword()
  → ambil profile dari tabel users berdasarkan auth_id
  → role = admin → redirect /admin
  → role = pelaksana → redirect /lapor
  → tidak ada profile → error
```

---

## 6. DATABASE SCHEMA

### Tabel `users`
```
id            uuid PK
nama          text
role          text  CHECK ('admin', 'pelaksana')
auth_id       uuid  FK → auth.users.id
created_at    timestamptz
```

### Tabel `work_orders`
```
id                uuid PK
wo_code           text UNIQUE  -- auto-generated: UTL26-07-01
tanggal_input     date DEFAULT current_date
tanggal_rencana   date
area              text  -- dari master_area
mesin_instrument  text  -- dari master_instrumen
deskripsi         text
kategori          text  -- dari master_kategori
prioritas         text  CHECK ('Low', 'Medium', 'High')
pic_id            uuid FK → users.id  -- PIC utama
target_durasi_jam numeric
status_wo         text  CHECK ('Belum Selesai', 'Selesai', 'Approved')
sumber            text  CHECK ('terencana', 'tidak terencana')
remarks           text  -- catatan admin saat reject
minggu            int   -- legacy, tidak dipakai di UI
created_at        timestamptz
```

### Tabel `reports` (1 laporan per WO)
```
id                      uuid PK
work_order_id           uuid FK UNIQUE → work_orders.id (ON DELETE CASCADE)
waktu_mulai             timestamptz  -- disimpan UTC
waktu_selesai           timestamptz  -- disimpan UTC
keterangan              text
foto_sebelum_url        text  -- Supabase Storage public URL
foto_sesudah_url        text
foto_sebelum_taken_at   timestamptz NULL  -- EXIF DateTimeOriginal
foto_sesudah_taken_at   timestamptz NULL
foto_sebelum_uploaded_at timestamptz NULL
foto_sesudah_uploaded_at timestamptz NULL
dilaporkan_oleh         uuid FK → users.id
created_at              timestamptz
```

### Tabel `wo_pelaksana` (many-to-many WO ↔ pelaksana)
```
id              uuid PK
work_order_id   uuid FK → work_orders.id (ON DELETE CASCADE)
user_id         uuid FK → users.id
peran           text  CHECK ('pic', 'support')
created_at      timestamptz
UNIQUE (work_order_id, user_id)
```

### Tabel `master_area`
```
id    uuid PK
nama  text UNIQUE
```

### Tabel `master_instrumen`
```
id    uuid PK
nama  text UNIQUE
```

### Tabel `master_kategori`
```
id    uuid PK
nama  text UNIQUE
```

### Tabel `data_harian` (riwayat pesan WA harian)
```
id                    uuid PK
tanggal               date
shift                 text  ('Shift 1', 'Shift 2', 'Shift 3')
operator_boiler_id    uuid FK → users.id NULL
operator_ws_id        uuid FK → users.id NULL
teknisi_id            uuid FK → users.id NULL
kepala_regu_id        uuid FK → users.id NULL
catatan               text
keterangan_nbl        text
keterangan_cepha      text
pesan_teks            text  -- full teks WA
ringkasan_boiler      text  -- untuk export Excel
ringkasan_ws          text
ringkasan_teknisi     text
ringkasan_kepala_regu text
created_at            timestamptz
```

---

## 7. ALUR KERJA UTAMA

### Alur Work Order

```
1. Admin buat WO
   → isi: tanggal, area, mesin, deskripsi, kategori, target durasi, prioritas
   → pilih PIC utama (1 orang)
   → pilih support (0 atau lebih orang)
   → kode WO auto-generate: UTL{YY}-{MM}-{NN} (trigger PostgreSQL)
   → status: "Belum Selesai"
   → data masuk ke work_orders + wo_pelaksana

2. Pelaksana (PIC) lapor
   → buka /lapor → tab "Daftar WO"
   → klik WO miliknya (status Belum Selesai)
   → isi: waktu mulai, waktu selesai, keterangan
   → upload foto sebelum + sesudah (dikompresi + dibaca EXIF otomatis)
   → submit → status: "Selesai"
   → data masuk ke tabel reports

3. Admin review laporan
   → buka /admin → klik WO di daftar
   → lihat detail: laporan pelaksana, foto, Photo Time Tracker
   → bisa edit target durasi
   → bisa revisi deskripsi/area/mesin/kategori
   → Approve → status: "Approved" → masuk dashboard KPI
   → Reject (+ remarks) → status: "Belum Selesai" → pelaksana lapor ulang

4. Pelaksana lapor ulang (setelah reject)
   → form otomatis ter-isi dengan data laporan sebelumnya (pre-filled)
   → foto lama tetap tersimpan, bisa diganti atau biarkan
   → tidak perlu input ulang semua dari awal
```

### Status Flow

```
Belum Selesai → (pelaksana submit) → Selesai → (admin approve) → Approved
                                               ↓ (admin reject + remarks)
                                            Belum Selesai (loop)
```

---

## 8. FITUR PER HALAMAN

### `/` — Login
- Form username + password
- Auto-redirect berdasarkan role

### `/admin` — Work Order (Admin)
- **Tab Work Order:** form buat WO baru, daftar WO dengan filter/search, export Excel
- **Tab Tambah Pelaksana:** buat akun baru (username + password)
- **Tab Master Data:** kelola area, instrumen, kategori (CRUD)
- Autocomplete deskripsi dari data WO sebelumnya
- Checkbox support (multi-select) saat buat WO

### `/admin/wo/[id]` — Detail WO
- Lihat detail WO (read-only kecuali target durasi dan revisi)
- Edit target durasi langsung dari halaman ini
- Revisi deskripsi/area/mesin/kategori (mode edit toggle)
- Lihat laporan pelaksana: waktu mulai, selesai, durasi aktual, keterangan
- Lihat foto sebelum + sesudah dengan metadata: tanggal diambil, jam diambil, jam diupload
- **Photo Time Tracker:** estimasi durasi dari EXIF Before→After
- Tombol Approve / Reject (dengan remarks)
- Tombol Batal Approve (untuk WO yang sudah Approved)
- Tombol Hapus WO (hanya jika status Belum Selesai)

### `/admin/wa` — Generator Pesan WA
- Pilih tanggal, shift, 4 peran (Operator Boiler, WS, Teknisi, Kepala Regu)
- Tiap peran: pilih nama (dropdown) + tugas poin 1 (teks manual, tersimpan di localStorage)
- Daftar WO tanggal itu otomatis masuk per orang:
  - Jika PIC → `[UTL26-07-XX] Deskripsi`
  - Jika support → `Support Deskripsi` (tanpa kode WO)
- Generate → tampil teks siap copy-paste ke WhatsApp
- Disimpan ke tabel `data_harian`
- Export Excel data harian berdasarkan filter tanggal

### `/dashboard` — Dashboard (Admin)
- Filter rentang tanggal (default semua data)
- **Chart status WO** (donut): klik slice → muncul daftar WO dengan status itu
- **Chart kategori** (donut, khusus Approved): klik slice → drill-down mesin/instrumen
- **KPI per pelaksana:** pilih nama + durasi shift → tampil 4 gauge:
  - Fullfillment WO = Approved ÷ Total × 100%
  - On Time WO = selesai tepat waktu (aktual ≤ target) ÷ Approved × 100%
  - Time Efficiency = total jam target ÷ total jam aktual × 100%
  - Effectivity Work Time = total jam aktual ÷ (shift × hari kerja unik) × 100%
- Tabel detail WO di bawah KPI (bisa klik → buka detail)
- Penjelasan rumus di bawah gauge
- Export Excel (rekap WO + sheet KPI)

### `/lapor` — Halaman Pelaksana
- **Tab Daftar WO:** WO yang ditugaskan (PIC), status Belum Selesai bisa diklik untuk lapor
- **Tab Buat WO:** untuk kerjaan tidak terencana (accidental), kode auto-generate
- **Tab History WO:** semua WO tim, filter tanggal (tidak muncul sebelum filter dipilih), klik expand → lihat keterangan + foto

---

## 9. ATURAN PENTING SISTEM

### Timezone
- Semua timestamp disimpan sebagai **UTC** di Supabase
- Input dari pelaksana menggunakan `datetime-local` → append `:00+07:00` sebelum disimpan
- Tampilan menggunakan `timeZone: 'Asia/Jakarta'`
- Helper: `toWIBISO()`, `toLocalInput()`, `formatDate()`, `formatTime()` di `src/utils/dateUtils.js`

### Foto
- Dikompresi client-side sebelum upload (Canvas API, maks 0.8 MB, kualitas 70%)
- Disimpan di Supabase Storage bucket `bukti-foto`
- EXIF dibaca menggunakan library `exifr` saat file dipilih
- `DateTimeOriginal` dari EXIF dianggap WIB → disimpan sebagai UTC dengan menambah offset `+07:00`

### WO Code Auto-generate
- Format: `UTL{YY}-{MM}-{NN}` (contoh: `UTL26-07-01`)
- Dibuat oleh PostgreSQL trigger `trg_generate_wo_code` → function `generate_wo_code()`
- Nomor urut (NN) dihitung dari WO yang sudah ada di bulan yang sama

### 1 WO = 1 Laporan
- Tabel `reports` punya constraint `UNIQUE(work_order_id)`
- Laporan ulang (setelah reject) menggunakan `upsert` dengan `onConflict: 'work_order_id'`
- Data lama (keterangan, foto) tetap ada saat lapor ulang, ter-prefill otomatis

### PIC & Support
- Setiap WO punya 1 PIC utama (`work_orders.pic_id`) dan 0+ support
- Relasi disimpan di tabel `wo_pelaksana` (`peran`: 'pic' atau 'support')
- Hanya PIC yang bisa lapor WO
- Support terlihat di daftar WO tapi tidak bisa diklik untuk lapor
- Untuk KPI: WO dihitung untuk PIC maupun semua support yang terlibat
- Untuk WA generator: PIC → tampil dengan kode WO, Support → tampil "Support [deskripsi]"

---

## 10. ROW LEVEL SECURITY (RLS)

Semua tabel menggunakan RLS Supabase:

| Tabel | Read | Insert | Update | Delete |
|---|---|---|---|---|
| users | authenticated | admin | - | - |
| work_orders | authenticated | admin + pelaksana (milik sendiri) | admin + pelaksana (milik sendiri) | admin |
| reports | authenticated | authenticated | pelaksana (milik sendiri) + admin | admin |
| wo_pelaksana | authenticated | admin + pelaksana (dirinya sendiri) | - | - |
| master_* | authenticated | admin | admin | admin |
| data_harian | admin | admin | admin | admin |
| storage (bukti-foto) | authenticated | authenticated | - | - |

---

## 11. KONVENSI KODE

### Import path
- Supabase client: `import { supabase } from '../../lib/supabase'` (sesuaikan depth)
- Utils: `import { formatDate } from '../../src/utils/dateUtils'`
- Constants: `import { WO_STATUS } from '../../src/constants'`
- Sidebar: `import Sidebar from '../components/Sidebar'`

### Pattern layout halaman
```jsx
return (
  <div className="app-layout">
    <Sidebar role="admin" namaUser={namaUser} />
    <div className="main-content">
      <div className="topbar">
        <h1>Judul Halaman</h1>
      </div>
      <div className="container">
        {/* konten */}
      </div>
    </div>
  </div>
);
```

### State loading
```jsx
if (!namaUser) return <div className="loading">Memuat...</div>;
```

### Auth check pattern (di setiap halaman)
```js
const { data: { user } } = await supabase.auth.getUser();
if (!user) { router.push('/'); return; }
const { data: profile } = await supabase.from('users')
  .select('nama, role').eq('auth_id', user.id).single();
if (!profile || profile.role !== 'admin') { router.push('/lapor'); return; }
setNamaUser(profile.nama);
```

### Timezone input pattern
```js
// Saat simpan ke DB:
waktu_mulai: localDatetimeStr + ':00+07:00'

// Saat tampil dari DB:
new Date(utcStr).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })

// Pre-fill form dari DB:
const d = new Date(new Date(utcStr).getTime() + 7 * 60 * 60 * 1000);
return d.toISOString().slice(0, 16);
```

---

## 12. CARA DEPLOY

1. **Database changes** → jalankan SQL di Supabase SQL Editor
2. **Code changes** → edit file, commit via GitHub Desktop, push ke `main`
3. **Auto deploy** → Vercel otomatis build & deploy saat ada push ke `main`
4. **Environment variables** di Vercel:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

## 13. HAL YANG TIDAK BOLEH DIUBAH TANPA KONFIRMASI

- Schema database (tabel, kolom, relasi)
- RLS policies
- PostgreSQL functions & triggers
- Nama route URL
- Logika bisnis (alur WO, kalkulasi KPI, format kode WO)
- Sistem autentikasi

---

## 14. CARA MENGGUNAKAN DOKUMEN INI

Saat membantu pengembangan Utility Monitoring System:

1. **Baca dulu** seluruh dokumen ini sebelum menulis kode apapun
2. **Konfirmasi pemahaman** sebelum generate jika ada perubahan yang menyentuh database atau alur bisnis
3. **Ikuti konvensi** yang sudah ada (pattern layout, auth check, timezone handling)
4. **Jangan ubah** yang sudah berjalan kecuali diminta eksplisit
5. **Selalu sertakan SQL migration** jika ada perubahan database
6. **Test mindset:** pertimbangkan edge case (data null, EXIF tidak ada, foto lama, dll)
