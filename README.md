# Bpomsound

Buatkan aplikasi web offline (bisa di-install sebagai PWA / dibuka lokal tanpa internet) untuk "Sistem Sound Otomatis Kantor BPOM Tanjung Balai".

Fitur utama yang harus ada dan berfungsi penuh di browser:
1. Jam Digital Real-Time & Indikator Status:
   - Menampilkan jam, menit, detik dan hari saat ini secara jelas.
   - Indikator status sistem: Aktif (Standby menunggu jadwal) atau Nonaktif.
   - Tombol toggle besar: "Aktifkan Jadwal Otomatis" / "Matikan Jadwal".
   - Tombol darurat merah besar: "STOP AUDIO SEKARANG" untuk menghentikan audio yang sedang berputar kapan saja dengan 1 klik.

2. Pengaturan Jadwal Mingguan (Senin - Kamis & hari lainnya):
   - Tabel/kartu jadwal tiap hari (Senin, Selasa, Rabu, Kamis, Jumat, Sabtu, Minggu).
   - Masing-masing hari bisa di-switch aktif/nonaktif.
   - Pilihan jam putar per hari (default diset jam 10:00 atau jam 16:00, user bisa ubah sendiri dengan input time yang mudah).
   - Pilihan upload / pilih file audio lokal untuk tiap hari (simpan ke IndexedDB browser agar tetap tersimpan offline dan tidak hilang saat halaman ditutup atau refresh).
   - Sudah terisi preset bawaan/placeholder untuk:
     * Senin: Instrumen - Hymne Universitas Royal
     * Selasa: Instrumen - Indonesia Raya
     * Rabu: Instrumen - Mars Universitas Royal
     * Kamis: Instrumen Jalan
   - Tombol "Test Putar" per baris hari agar staf kantor bisa langsung uji coba suara ke speaker bluetooth tanpa menunggu jadwal.

3. Fitur Pencegah Sleep / Background Keep-Alive:
   - Fitur Web Audio API keep-silent loop untuk mencegah browser sleep atau speaker bluetooth standby mati sendiri saat komputer diam.
   - Dukungan Screen Wake Lock API (opsional toggle) agar layar komputer tetap aktif jika diperlukan.
   - Kontrol Volume master langsung di aplikasi.

4. Desain & UX:
   - Tampilan bersih, resmi, modern khas instansi pemerintah (aksen biru BPOM / merah putih), ramah bagi pengguna awam kantor yang tidak paham teknis.
   - Dilengkapi panduan singkat 3 langkah di pojok/modal: "1. Hubungkan speaker bluetooth, 2. Pilih lagu & jam, 3. Biarkan tab ini tetap terbuka".
   - Semua pengaturan (jadwal, jam, status aktif/nonaktif, file audio) tersimpan otomatis di localStorage / IndexedDB browser, bekerja 100% offline tanpa koneksi internet.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://bpomsound.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/f3ef1873-b8de-4c8e-a6cf-7072023116db).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
