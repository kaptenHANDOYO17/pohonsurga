# 🌳 Pohon Keluarga Bani H. Kholid Ismail Noer

Website silsilah keluarga bertema **Pohon Kehidupan & Islami** untuk Keluarga Besar
Bapatua H. Syafi'i – Matua Juhairiyah (Bani H. Kholid Ismail Noer – Hj. Muslikha dan
Bani H. Musyaidin Syafi'i – Hj. Chafsah), berdasarkan buku *Silaturrahim Keluarga Besar* (3 April 2021).

**Teknologi:** Next.js 16 (React 19, TypeScript, Tailwind CSS 4) · Supabase (PostgreSQL + Auth + Storage) · Vercel

---

## Daftar isi

1. [Fitur](#1-fitur)
2. [Isi proyek](#2-isi-proyek)
3. [Langkah 1 — Siapkan Supabase](#3-langkah-1--siapkan-supabase)
4. [Langkah 2 — Jalankan di komputer (VS Code)](#4-langkah-2--jalankan-di-komputer-vs-code)
5. [Langkah 3 — Push ke GitHub](#5-langkah-3--push-ke-github)
6. [Langkah 4 — Deploy ke Vercel](#6-langkah-4--deploy-ke-vercel)
7. [Cara memakai website (anggota)](#7-cara-memakai-website-anggota)
8. [Cara memakai Ruang Admin](#8-cara-memakai-ruang-admin)
9. [Keamanan](#9-keamanan)
10. [Catatan data dari buku](#10-catatan-data-dari-buku)
11. [Mengatasi masalah](#11-mengatasi-masalah)

---

## 1. Fitur

**Untuk anggota keluarga**
- 🔐 **Login ramah semua umur**: cukup *nama* + *tanggal lahir* (pilih tanggal/bulan/tahun). Gelar (H., Hj., Drs., S.E.) tidak perlu diketik, nama panggilan juga diterima.
- 🌳 **Pohon interaktif**: akar (leluhur) di bawah, generasi muda di atas. Seret untuk menggeser, scroll/cubit untuk zoom — nyaman di HP dan laptop. Bisa dibalik (leluhur di atas).
- 🍃 **Daun hijau** = masih hidup, **daun coklat** = sudah wafat (lengkap dengan doa *Allahummaghfirlahu/ha*).
- 💍 Pasangan/menantu tampil berdampingan dengan simbol cincin; anak bawaan ditandai garis titik-titik.
- ✨ **Relasi Pintar**: "Anda adalah anak ke-1 dari …", lalu satu ketukan untuk menyorot Orang Tua, Saudara, Pakde/Bude/Om/Tante, Sepupu, Keponakan, Ipar, Mertua, Kakek-Nenek, Anak, Cucu. Cabang yang tidak relevan otomatis diringkas.
- 🔎 Klik kartu mana pun → muncul **"Hubungan dengan Anda"** (mis. *Pakde — saudara dari ayah Anda*), orang tua, pasangan, anak, saudara.
- 📋 **Tampilan Daftar** (grid rapi per generasi) dengan filter: masih hidup, wafat, penghafal Qur'an, menantu.
- 📖 Lencana **hafalan Al-Qur'an** (data huffadz Maret 2021).
- ➕/➖ Buka-tutup cabang, pencarian nama, "pusatkan ke saya", ringkas sampai cucu.

**Untuk admin**
- ✍️ **CRUD lengkap**: tambah / edit / hapus anggota, dengan formulir "Sebagai apa dia?" (Anak / Pasangan / Anak Bawaan) dan "Hubungannya ke siapa?" (anak dari siapa, dengan pasangan yang mana, anak ke-berapa, pernikahan ke-berapa).
- 👁️ Pratinjau kalimat sebelum menyimpan, mis. *"Handoyo akan tercatat sebagai anak ke-1 dari Anis Surrozik & Nur Aeni — Generasi 3 · Cucu."*
- 📷 **Upload foto khusus admin**, **maksimal 1 foto per anggota** (foto baru otomatis menggantikan & menghapus foto lama). Foto dikompres otomatis di browser.
- 🧭 Tombol cepat: Edit, Foto, + Anak, + Pasangan, + Anak bawaan; filter "Belum ada foto" & "Belum ada tgl lahir".
- 👀 "Lihat sebagai anggota" untuk mengecek Relasi Pintar dari sudut pandang siapa pun.
- 🕑 Riwayat perubahan (audit log).

---

## 2. Isi proyek

```
pohon-keluarga-bani-kholid/
├── supabase/
│   ├── 01_schema.sql        ← tabel, keamanan (RLS), storage foto, trigger
│   ├── 02_seed.sql          ← 226 anggota + 62 pernikahan dari buku keluarga
│   └── 03_admin.sql         ← menjadikan akun Anda admin
├── src/
│   ├── app/
│   │   ├── page.tsx         ← halaman login anggota
│   │   ├── pohon/           ← halaman pohon keluarga (wajib login)
│   │   ├── admin/           ← Ruang Admin (CRUD + foto) & login admin
│   │   └── actions/         ← server actions login/logout
│   ├── components/tree/     ← kanvas pohon, kartu daun, panel relasi, daftar, detail
│   ├── components/ui/       ← avatar, modal, pemilih anggota, ornamen
│   ├── lib/kinship.ts       ← mesin "Relasi Pintar" (istilah kekerabatan)
│   ├── lib/layout.ts        ← tata letak pohon
│   └── proxy.ts             ← penjaga rute (wajib login)
├── .github/workflows/ci.yml ← cek otomatis di GitHub
├── .env.example             ← contoh variabel lingkungan
└── README.md                ← panduan ini
```

---

## 3. Langkah 1 — Siapkan Supabase

1. Buka **https://supabase.com** → *Sign in* → **New project**.
   - Name: `pohon-keluarga` · Database password: buat yang kuat (simpan) · Region: **Southeast Asia (Singapore)**.
2. Tunggu proyek siap, lalu buka **SQL Editor** → **New query**.
3. Buka file `supabase/01_schema.sql` di VS Code → **Select All → Copy** → tempel di SQL Editor → **Run**.
   Harus muncul *Success. No rows returned*.
4. Buat query baru → tempel isi `supabase/02_seed.sql` → **Run**.
   Di bagian bawah akan tampil jumlah: `bawaan 9 · keturunan 155 · pasangan 62`.
5. **Buat akun admin**: menu **Authentication → Users → Add user → Create new user**
   - Isi email Anda + password kuat (min. 12 karakter, campuran huruf/angka/simbol).
   - Centang **Auto Confirm User** → *Create user*.
6. Buat query baru → tempel isi `supabase/03_admin.sql` → **ganti** `GANTI-DENGAN-EMAIL-ADMIN@gmail.com` dengan email tadi → **Run**.
   Harus muncul 1 baris berisi email Anda.
7. **Matikan pendaftaran umum** (penting): **Authentication → Sign In / Providers** → nonaktifkan **"Allow new users to sign up"** → Save.
   (Admin baru cukup ditambahkan manual lewat langkah 5–6.)
8. Ambil kunci API: **Project Settings → API Keys** (atau *Data API*):
   - **Project URL** → untuk `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** *atau* **Publishable key** (`sb_publishable_…`) → untuk `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** *atau* **Secret key** (`sb_secret_…`) → untuk `SUPABASE_SERVICE_ROLE_KEY` ⚠️ **rahasia, jangan dibagikan**

> Bucket foto `family-photos` (privat, maks. 2 MB, JPG/PNG/WEBP) sudah otomatis dibuat oleh `01_schema.sql`.

---

## 4. Langkah 2 — Jalankan di komputer (VS Code)

Prasyarat: **Node.js 20.9+** (disarankan versi LTS 22 dari https://nodejs.org) dan **Git**.

1. Ekstrak ZIP proyek → buka foldernya di **VS Code** (*File → Open Folder*).
2. Buka terminal VS Code (**Ctrl + `**) lalu jalankan:
   ```bash
   npm install
   ```
3. Salin `.env.example` menjadi `.env.local`:
   ```bash
   cp .env.example .env.local        # Windows PowerShell: copy .env.example .env.local
   ```
4. Buat `SESSION_SECRET` acak:
   ```bash
   node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
   ```
5. Isi `.env.local` dengan kunci dari Supabase + hasil langkah 4. Disarankan juga mengisi
   `FAMILY_ACCESS_CODE` (misal `silaturrahim2026`) — lihat bagian [Keamanan](#9-keamanan).
6. Jalankan:
   ```bash
   npm run dev
   ```
   Buka **http://localhost:3000**. Coba login sebagai anggota, mis. nama **Handoyo** + tanggal lahir yang tercatat.
   Ruang admin: **http://localhost:3000/admin/login**.

---

## 5. Langkah 3 — Push ke GitHub

1. Di GitHub: **New repository** → nama mis. `pohon-keluarga` → pilih **Private** (disarankan) → *Create* (jangan centang README).
2. Di terminal VS Code:
   ```bash
   git init
   git add .
   git commit -m "Pohon keluarga Bani H. Kholid Ismail Noer"
   git branch -M main
   git remote add origin https://github.com/USERNAME/pohon-keluarga.git
   git push -u origin main
   ```
3. Pastikan `.env.local` **tidak** ikut ter-upload (sudah diatur di `.gitignore`).
   Tab **Actions** di GitHub akan menjalankan pemeriksaan otomatis (typecheck + build) setiap push.

---

## 6. Langkah 4 — Deploy ke Vercel

1. Buka **https://vercel.com** → login dengan GitHub → **Add New… → Project** → pilih repo `pohon-keluarga` → **Import**.
2. Framework otomatis terdeteksi **Next.js**. Buka **Environment Variables** dan isi:

   | Name | Value |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | Project URL Supabase |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon / publishable key |
   | `SUPABASE_SERVICE_ROLE_KEY` | service_role / secret key |
   | `SESSION_SECRET` | string acak min. 32 karakter (boleh sama dengan lokal) |
   | `FAMILY_ACCESS_CODE` | (opsional, disarankan) kode keluarga |
   | `NEXT_PUBLIC_SITE_TITLE` | (opsional) judul website |
   | `NEXT_PUBLIC_SITE_SUBTITLE` | (opsional) subjudul |

3. Klik **Deploy**. Setelah selesai Anda mendapat alamat seperti `https://pohon-keluarga.vercel.app`.
4. Setiap kali Anda `git push` ke `main`, Vercel otomatis men-deploy versi terbaru.
   Jika mengubah Environment Variables, lakukan **Redeploy** (tab *Deployments → … → Redeploy*).

---

## 7. Cara memakai website (anggota)

1. Buka alamat website → isi **Nama lengkap** (tanpa gelar pun boleh, atau nama panggilan) → pilih **tanggal, bulan, tahun lahir** → (isi kode keluarga bila diminta) → **Masuk**.
2. Pohon langsung memusatkan ke kartu Anda (bertanda **ANDA**).
   - **Geser**: seret dengan jari/mouse · **Zoom**: cubit (HP) atau scroll (laptop) / tombol ➕➖
   - Tombol kanan bawah: ⛶ lihat seluruh pohon · 🎯 pusatkan ke saya · ⇅ balik arah pohon · ⇕ ringkas/buka semua cabang
   - Tombol kecil ➖/➕ di dahan untuk menutup/membuka cabang keluarga tertentu.
3. **Relasi Pintar** (panel kiri di laptop, tombol hijau "Relasi Pintar" di HP): ketuk mis. **Sepupu** → semua sepupu menyala, yang lain meredup. Ketuk nama di daftar untuk melompat ke kartunya. Tombol **Lihat daftar** menampilkan mereka dalam grid.
4. Ketuk kartu siapa pun untuk melihat detail & **hubungannya dengan Anda**.
5. Tab **Daftar**: semua anggota per generasi, dengan statistik dan filter.

> Tanggal lahir lengkap **tidak pernah ditampilkan** ke anggota (hanya tahun), karena tanggal lahir dipakai untuk login.

---

## 8. Cara memakai Ruang Admin

Masuk di **/admin/login** dengan email & password admin. Admin juga otomatis bisa membuka halaman pohon
(tombol **Lihat Pohon**), dan di pohon muncul tombol **Edit / Tambah anak / Tambah pasangan** pada detail anggota.

### Contoh: menambahkan foto Handoyo
1. Di Ruang Admin, ketik **Handoyo** di kotak pencarian.
2. Klik tombol **📷 Foto** (atau ketuk ikon kamera di avatarnya).
3. Klik **Unggah foto** → pilih foto dari galeri/komputer (bisa juga *drag & drop* di laptop).
4. Selesai — foto otomatis dikompres, tersimpan, dan langsung tampil di pohon.
   Foto baru akan **menggantikan** foto lama (maksimal 1 foto per orang). Tombol **Hapus** untuk menghapus foto.

### Menambah anggota baru
- **Anak/cucu baru**: cari orang tuanya → klik **+ Anak**. Kolom "Anak dari", "Dengan pasangan", dan "Anak ke-" terisi otomatis → isi nama, jenis kelamin, tanggal lahir, domisili → **Tambahkan**.
- **Menantu / pasangan**: cari anggota keluarganya → klik **+ Pasangan** → isi data → atur *Pernikahan ke-* dan *Status*.
- **Anak bawaan** (anak dari pernikahan sebelumnya pasangan): cari menantunya → **+ Anak bawaan**.
- Atau klik **+ Tambah anggota** lalu pilih sendiri **"Sebagai apa dia?"** dan **"Hubungannya ke siapa?"**.
- Pastikan **tanggal lahir** diisi agar orang tersebut bisa login.

### Mengedit & menghapus
- **Edit**: ubah apa saja, termasuk memindahkan seseorang ke orang tua yang benar (sistem menolak relasi melingkar).
- **Hapus**: anggota yang masih punya anak tidak bisa dihapus (pindahkan/hapus anaknya dulu) — ini mencegah cabang "terputus" tanpa sengaja.
- Saat seseorang wafat: Edit → Status **Sudah wafat** → daunnya berubah coklat.

### Menambah admin lain
Tambah user di Supabase (Authentication → Users), lalu jalankan `03_admin.sql` dengan email tersebut.

---

## 9. Keamanan

Lapisan perlindungan yang sudah diterapkan:

| Lapisan | Penjelasan |
|---|---|
| **Row Level Security** | Semua tabel memakai RLS. Kunci *anon* publik **tidak bisa membaca apa pun**. Hanya akun di tabel `admins` yang bisa menulis. Sudah diuji: anon & user non-admin ditolak. |
| **Data dibaca di server** | Data keluarga hanya dikirim ke browser setelah sesi anggota terverifikasi. Kunci *service role* hanya ada di server (tidak pernah dikirim ke browser). |
| **Sesi anggota** | Cookie `HttpOnly`, `Secure`, `SameSite=Lax`, ditandatangani HS256 (`SESSION_SECRET`), berlaku 30 hari. |
| **Batas percobaan login** | Maks. 8 kali gagal per 15 menit per perangkat/IP (IP disimpan dalam bentuk hash). Pesan error dibuat umum. |
| **Kode keluarga (opsional)** | `FAMILY_ACCESS_CODE` menambah satu "kunci" ekstra. **Sangat disarankan** karena tanggal lahir sering diketahui orang lain. Bagikan kode lewat grup WA keluarga dan ganti berkala. |
| **Tanggal lahir disembunyikan** | Anggota hanya melihat tahun lahir orang lain, bukan tanggal lengkap. |
| **Foto privat** | Bucket privat, hanya bisa diunggah admin, dibaca via *signed URL* yang kedaluwarsa (6 jam). Validasi tipe file (magic bytes), maks. 2 MB, 1 foto per orang. |
| **Validasi input** | Semua isian divalidasi di server (Zod) + constraint & trigger database (anti relasi melingkar, panjang teks). |
| **Header keamanan** | CSP, HSTS, X-Frame-Options DENY, nosniff, Referrer-Policy, Permissions-Policy, `noindex` (tidak muncul di Google). |
| **Audit log** | Setiap tambah/ubah/hapus oleh admin tercatat. |
| **Privasi** | Alamat lengkap & nomor HP dari buku **tidak** dimasukkan; domisili hanya kota/kecamatan. |

**Yang perlu Anda lakukan:**
- ✅ Matikan *"Allow new users to sign up"* di Supabase (Langkah 1.7).
- ✅ Gunakan password admin yang kuat; aktifkan juga 2FA di akun GitHub, Vercel, dan Supabase.
- ✅ Isi `FAMILY_ACCESS_CODE`.
- ✅ Jadikan repo GitHub **Private**; jangan pernah membagikan `SUPABASE_SERVICE_ROLE_KEY` / `SESSION_SECRET`.
- ✅ Jika kunci bocor: buat ulang di Supabase (*API Keys*), ganti `SESSION_SECRET` (semua anggota otomatis logout), lalu Redeploy.
- ✅ Jalankan `npm audit` / `npm update` berkala untuk pembaruan keamanan.

---

## 10. Catatan data dari buku

Data dimasukkan dari buku silsilah (per 31 Maret 2021). Beberapa hal **perlu dicek ulang oleh keluarga** dan bisa diperbaiki lewat Ruang Admin:

1. **Status wafat diasumsikan** untuk H. Syafi'i, Hj. Juhairiyah, Matua Sirih, Hj. Muslikha, H. Kholid Ismail Noer, H. Musyaidin Syafi'i, dan Hj. Chafsah (buku tidak menuliskannya secara tegas).
2. **Istri Anis Surrozik (Nur Aeni)** diambil dari halaman Huffadz ("Handoyo bin Anis Surrozik – Nur Aeni"); di halaman silsilah kolomnya kosong.
3. **Cucu & buyut Hj. Zumrotus Zianah**: penomoran di buku tidak konsisten. Reza, Atik, Afien, dan Fariz dicatat sebagai anak **Zaenul Muslimin & Masyitoh** (sesuai nomor canggah 2.1.x.x dan urutan daftar HP). Azhar & Talita dicatat sebagai anak **Slamet Muslimin (Ivan)**, sedangkan Faiz & Nafan anak **Hj. Latifah & Sumantri** (Azhar lahir Des 1995 dan Faiz Mei 1996, sehingga tidak mungkin satu ibu).
4. **Fanny, Syathir, Ila** tertulis 1.5.x di buku, tetapi halaman Huffadz menyebut *binti/bin Safiudin – Helida* → dicatat sebagai anak **Helida**.
5. **Nurfi Misyka**: buku menulis 08-01-1982 (sama dengan tgl lahir Etis); halaman Huffadz: 03-04-2005, *binti Zaenul – Herni* → dipakai **03-04-2005**, anak Zainul Mukhlisin (Nenung).
6. **Tanggal lahir yang berbeda antara silsilah & halaman Huffadz**:
   - Muhammad Zia Ul Chaleef: 2001 vs **2011** (dipakai 2011, sesuai usia 10 th & kelas IV)
   - Aqila Bintang Muhammad: 2012 vs **2010** (dipakai 2010, sesuai usia 10 th)
   - Dinda (29 Jul vs 29 Jun 2001), Fursan (31 Jul vs 31 Mei 2006), Dias (8 Ags vs 8 Jan 2005), Azkia Salsabila (20 Feb vs 20 Nov 2011), Khayyi (3 Feb vs 2 Mar 2009) → dipakai **versi silsilah**.
7. **Dra. Hj. Siti Zubaidah**: daftar menulis 11-12-1958 (sama persis dengan suaminya); bagan menulis 11 Nov 1958 → dipakai **11-11-1958**.
8. **Ryan Hafiz (16-01-2008)** tertulis di kolom "Cucu Menantu" keluarga H. Muhammad Zahrudin, tetapi rekap menghitung 5 cucu & 1 cucu menantu → dicatat sebagai **anak ke-5 Zahrudin**.
9. **Hj. Salamah** (istri pertama H. Slamet), **Ir. Hj. Kuswardani** (istri pertama Drs. H. Moh. Aksin), **Hj. Sri Wiyarsih, SE** (istri pertama H. Abdul Aziz) ditambahkan sebagai pasangan agar anak-anaknya terhubung; status pernikahannya dikosongkan.
10. **Jenis kelamin** ditebak dari nama/pasangan; *Rizqum Minalloh* dan *Ain Nuzro* dikosongkan.
11. **Domisili** diringkas dari alamat (kota/kecamatan); domisili pasangan disamakan dengan pasangannya.
12. **Belum punya tanggal lahir** (belum bisa login sampai diisi): Hj. Salamah, Arief Muhardiansyah, Rini Fuji Purwati, Nur Aeni, Ir. Hj. Kuswardani, Hj. Sri Wiyarsih.
13. Data hafalan Al-Qur'an adalah posisi **Maret 2021**. Kelahiran, pernikahan, atau kabar duka sejak 2021 perlu ditambahkan.

---

## 11. Mengatasi masalah

| Masalah | Solusi |
|---|---|
| Muncul kotak "Konfigurasi belum lengkap" | Ada Environment Variable yang belum diisi (lokal: `.env.local`, Vercel: Settings → Environment Variables lalu Redeploy). |
| Anggota tidak bisa login | Pastikan tanggal lahirnya terisi di Ruang Admin & ejaan nama mirip. Jika "terlalu banyak percobaan", tunggu 15 menit. |
| "Akun ini bukan admin" | Jalankan `03_admin.sql` dengan email yang benar. |
| Halaman pohon error | Pastikan `01_schema.sql` dan `02_seed.sql` sudah dijalankan dan kunci service role benar. |
| Upload foto gagal | Gunakan JPG/PNG/WEBP. Foto HEIC dari iPhone: ubah setelan Kamera → Format → *Most Compatible*, atau kirim/simpan ulang sebagai JPG. |
| Pohon terlalu lebar | Gunakan tombol ⇕ (ringkas sampai cucu), tutup cabang dengan ➖, atau pakai tab **Daftar**. |
| Proyek Supabase "paused" | Proyek gratis bisa dijeda bila lama tidak dipakai; buka dashboard Supabase lalu klik *Restore*. |

Perintah berguna:
```bash
npm run dev        # mode pengembangan
npm run typecheck  # cek TypeScript
npm run build      # build produksi (sama seperti di Vercel)
```

---

*رَبِّ اجْعَلْنِي مُقِيمَ الصَّلَاةِ وَمِنْ ذُرِّيَّتِي ۚ رَبَّنَا وَتَقَبَّلْ دُعَاءِ* — QS. Ibrahim: 40
