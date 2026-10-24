import { History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

// Retrospective milestones from the app's development history, not dated releases.
const VERSIONS = [
  { version: "1.8", title: "Status versi dan riwayat aplikasi", changes: ["Nomor versi tampil di bagian atas aplikasi.", "Riwayat perubahan sejak versi 1.0 dapat dibuka dari tombol versi dan tersedia tanpa internet pada aplikasi yang sudah tersimpan offline."] },
  { version: "1.7", title: "Tampilan ponsel dan dua waktu putar", changes: ["Header dan menu dirapikan untuk ponsel serta aplikasi terpasang.", "Pilihan audio menggunakan pemilih file yang dapat disentuh langsung.", "Masing masing sound pulang memiliki waktu putar pertama dan kedua dengan satu file audio.", "Kedua waktu disimpan di perangkat dan ikut dalam cadangan. Alur data dan penggunaan offline telah diuji."] },
  { version: "1.6", title: "Jadwal sound pulang", changes: ["Sound Peringatan Pulang ditambahkan dengan waktu awal 15:55.", "Sound Pulang ditambahkan dengan waktu awal 16:00.", "Keduanya berjalan setiap Senin sampai Kamis, memiliki pilihan audio dan Test Putar, serta ikut dalam cadangan."] },
  { version: "1.5", title: "Kredit pembuat dan penyempurnaan ikon", changes: ["Panduan Singkat mencantumkan Dibuat Oleh PT Coodlex Technology Indonesia.", "Sisa putih di sudut ikon aplikasi dan website dihapus.", "Alamat ikon diperbarui agar ikon baru tidak tertukar dengan ikon lama yang tersimpan."] },
  { version: "1.4", title: "Logo transparan dan ukuran lebih jelas", changes: ["Latar luar putih logo sound dihapus dengan detail speaker tetap dipertahankan.", "Logo sound digunakan pada header, ikon aplikasi, dan tab website.", "Logo BPOM serta nama aplikasi diperbesar agar lebih jelas."] },
  { version: "1.3", title: "Penempatan logo", changes: ["Logo BPOM dipindahkan ke samping jam digital.", "Logo sound kembali digunakan di bagian atas aplikasi."] },
  { version: "1.2", title: "Identitas BPOM dan cadangan offline", changes: ["Logo BPOM dan nama Sistem Sound Otomatis Kantor BPOM Tanjung Balai ditambahkan.", "Jadwal dibatasi menjadi Senin sampai Kamis.", "Judul audio mengikuti nama file yang dipilih, menggantikan judul bawaan.", "Cadangan dan pemulihan ZIP berisi jadwal serta audio ditambahkan untuk pindah perangkat tanpa internet.", "Tampilan disesuaikan untuk ponsel, tablet, dan komputer."] },
  { version: "1.1", title: "Perbaikan aplikasi offline", changes: ["Penyimpanan halaman dan berkas aplikasi diperbaiki agar aplikasi yang sudah dibuka online dapat dibuka kembali tanpa internet.", "Indikator Mode: Offline ditambahkan.", "Audio tetap dapat dibaca dari penyimpanan perangkat saat tidak ada koneksi."] },
  { version: "1.0", title: "Aplikasi awal", changes: ["Jam digital, tanggal, status aktif, dan tombol jadwal otomatis.", "Jadwal awal Senin sampai Minggu dengan pilihan jam, audio lokal, dan Test Putar.", "Tombol STOP AUDIO SEKARANG, volume, pencegah speaker standby, dan pilihan layar tetap menyala.", "Pengaturan tersimpan di perangkat, audio tersimpan lokal, serta Panduan Singkat dan pemasangan sebagai aplikasi tersedia."] },
] as const;

export function AppVersion() {
  const current = VERSIONS[0].version;
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" className="mt-1 h-auto min-h-9 max-w-full justify-start gap-2 whitespace-normal px-0 py-1 text-xs text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground" aria-label={`Versi ${current}, lihat riwayat perubahan`}>
          <History className="h-4 w-4 shrink-0" />
          <span>Versi {current} · Riwayat perubahan</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="flex max-h-[85dvh] w-[calc(100%-2rem)] max-w-xl flex-col overflow-hidden rounded-lg p-0">
        <DialogHeader className="shrink-0 border-b px-5 pb-4 pt-6 pr-12 text-left">
          <DialogTitle className="text-xl font-extrabold">Riwayat Versi Aplikasi</DialogTitle>
          <DialogDescription>BPOM Tanjung Balai · Versi saat ini {current}</DialogDescription>
        </DialogHeader>
        <div className="min-h-0 overflow-y-auto overscroll-contain px-5 pb-6">
          <p className="mb-5 text-xs text-muted-foreground">Penomoran versi disusun sekarang berdasarkan urutan pengembangan sebelumnya, bukan catatan tanggal rilis resmi. Versi ini menunjukkan aplikasi yang sedang dibuka.</p>
          <ol className="space-y-6 border-l border-border pl-4">
            {VERSIONS.map((entry, index) => (
              <li key={entry.version}>
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="font-mono text-sm font-bold text-primary">Versi {entry.version}</span>
                  {index === 0 && <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-foreground"><span className="h-2 w-2 rounded-full bg-success" />Saat ini</span>}
                </div>
                <h3 className="mb-2 text-base font-bold">{entry.title}</h3>
                <ul className="list-disc space-y-1.5 pl-4 text-sm leading-relaxed text-muted-foreground">
                  {entry.changes.map((change) => <li key={change}>{change}</li>)}
                </ul>
              </li>
            ))}
          </ol>
        </div>
      </DialogContent>
    </Dialog>
  );
}