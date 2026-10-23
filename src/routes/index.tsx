import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { saveAudio, getAudio, deleteAudio } from "@/lib/audio-db";
import { registerAppSW } from "@/lib/sw-register";
import { Button } from "@/components/ui/button";
import { FilePicker, AUDIO_ACCEPT } from "@/components/file-picker";
import { dueSoundJobs } from "@/lib/sound-schedule";
import { Download, Upload, Play, Square, Pause, HelpCircle, ShieldCheck } from "lucide-react";
import { DAYS, ORDER, DEFAULTS, LEAVING_LABELS, LEAVING_SLOTS, SETTINGS_KEY as LS, normalizeSettings, type Settings, type DayCfg, type LeavingCfg, type LeavingKey } from "@/lib/sound-settings";
import { createBackup, readBackup, restoreBackup } from "@/lib/sound-backup";
import bpomLogo from "@/assets/bpom-logo.png.asset.json";
import soundLogo from "@/assets/sound-logo-clean-v3.png";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sistem Sound Otomatis Kantor BPOM Tanjung Balai" },
      { name: "description", content: "Pemutar audio terjadwal otomatis untuk Kantor BPOM Tanjung Balai, bekerja offline." },
      { property: "og:title", content: "Sistem Sound Otomatis Kantor BPOM Tanjung Balai" },
      { property: "og:description", content: "Pemutar audio terjadwal otomatis, bekerja offline." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

function Index() {
  const [s, setS] = useState<Settings>(DEFAULTS);
  const [loaded, setLoaded] = useState(false);
  const [now, setNow] = useState<Date | null>(null);
  const [playing, setPlaying] = useState<string | null>(null);
  const [guide, setGuide] = useState(false);
  const [log, setLog] = useState<string>("");
  const [offline, setOffline] = useState(false);
  const [backupBusy, setBackupBusy] = useState(false);
  const [pendingBackup, setPendingBackup] = useState<Awaited<ReturnType<typeof readBackup>> | null>(null);
  const [saved, setSaved] = useState(false);
  const operationRef = useRef(0);

  useEffect(() => {
    const upd = () => setOffline(!navigator.onLine);
    upd();
    window.addEventListener("online", upd);
    window.addEventListener("offline", upd);
    return () => {
      window.removeEventListener("online", upd);
      window.removeEventListener("offline", upd);
    };
  }, []);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const wakeRef = useRef<WakeLockSentinel | null>(null);
  const firedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS);
      if (raw) {
        const p = JSON.parse(raw);
        setS(normalizeSettings(p));
      } else setGuide(true);
    } catch {}
    setLoaded(true);
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    registerAppSW();
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (loaded) {
      try { localStorage.setItem(LS, JSON.stringify(s)); setSaved(true); }
      catch { setSaved(false); setLog("Pengaturan gagal disimpan. Unduh cadangan sebelum menutup aplikasi."); }
    }
    if (audioRef.current) audioRef.current.volume = s.volume;
  }, [s, loaded]);

  // Keep-alive silent loop
  useEffect(() => {
    if (!loaded) return;
    if (s.keepAlive && s.active) {
      const start = () => {
        if (ctxRef.current) { ctxRef.current.resume(); return; }
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        g.gain.value = 0.0008;
        osc.frequency.value = 20;
        osc.connect(g).connect(ctx.destination);
        osc.start();
        ctxRef.current = ctx;
      };
      start();
      document.addEventListener("click", start, { once: true });
      return () => document.removeEventListener("click", start);
    } else if (ctxRef.current) {
      ctxRef.current.close();
      ctxRef.current = null;
    }
    return undefined;
  }, [s.keepAlive, s.active, loaded]);

  // Wake lock
  useEffect(() => {
    if (!loaded) return;
    const req = async () => {
      if (s.wakeLock && "wakeLock" in navigator && document.visibilityState === "visible") {
        try { wakeRef.current = await navigator.wakeLock.request("screen"); } catch {}
      }
    };
    if (s.wakeLock) req(); else { wakeRef.current?.release(); wakeRef.current = null; }
    const vis = () => s.wakeLock && req();
    document.addEventListener("visibilitychange", vis);
    return () => document.removeEventListener("visibilitychange", vis);
  }, [s.wakeLock, loaded]);

  // Scheduler — morning sound per day plus the two leaving sounds on workdays
  useEffect(() => {
    if (!now || !s.active) return;
    for (const job of dueSoundJobs(s, now)) {
      const key = `${now.toDateString()}-${job.time}-${job.audioKey}`;
      if (!firedRef.current.has(key)) {
        firedRef.current.add(key);
        void playAudio(job.audioKey, job.name, "Jadwal otomatis");
      }
    }
  }, [now]); // eslint-disable-line react-hooks/exhaustive-deps

  function chime() {
    const ctx = new AudioContext();
    [523, 659, 784, 1046].forEach((f, i) => {
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.frequency.value = f; g.gain.setValueAtTime(s.volume * 0.3, ctx.currentTime + i * 0.35);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.35 + 0.6);
      o.connect(g).connect(ctx.destination); o.start(ctx.currentTime + i * 0.35); o.stop(ctx.currentTime + i * 0.35 + 0.6);
    });
    setTimeout(() => ctx.close(), 2500);
  }

  async function playAudio(audioKey: string, name: string, note: string) {
    stop();
    const operation = operationRef.current;
    let blob: Blob | undefined;
    try { blob = await getAudio(audioKey); }
    catch { setLog("Audio tidak dapat dibaca dari penyimpanan perangkat."); return; }
    if (operation !== operationRef.current) return;
    const stamp = new Date().toLocaleTimeString("id-ID");
    if (!blob) {
      chime();
      setLog(`${stamp}: ${name}, belum ada file audio, memutar nada uji.`);
      return;
    }
    const a = new Audio(URL.createObjectURL(blob));
    a.volume = s.volume;
    a.onended = () => { if (audioRef.current === a) stop(); };
    audioRef.current = a;
    try {
      await a.play();
      setPlaying(name);
      setLog(`${stamp}: ${note}, ${name}`);
    } catch {
      setLog(`${stamp}: Gagal memutar. Klik sekali di halaman agar browser mengizinkan suara.`);
    }
  }

  function play(day: number, auto = false) {
    const cfg = s.days[day];
    if (cfg) void playAudio(`day-${day}`, cfg.title, auto ? "Jadwal otomatis" : "Test putar");
  }

  function stop() {
    operationRef.current += 1;
    if (audioRef.current) {
      audioRef.current.pause();
      URL.revokeObjectURL(audioRef.current.src);
      audioRef.current = null;
    }
    setPlaying(null);
  }

  const upd = (d: number, p: Partial<DayCfg>) =>
    setS((x) => { const cfg = x.days[d]; return cfg ? { ...x, days: { ...x.days, [d]: { ...cfg, ...p } } } : x; });

  async function onFile(d: number, f?: File) {
    if (!f) return;
    try {
      await saveAudio(`day-${d}`, f);
      upd(d, { fileName: f.name, title: f.name });
      setLog(`${DAYS[d]}: ${f.name} tersimpan di perangkat ini.`);
      if (navigator.storage?.persist) void navigator.storage.persist().catch(() => {});
    } catch { setLog("Audio gagal disimpan. Periksa ruang penyimpanan perangkat dan coba kembali."); }
  }

  const updLeaving = (k: LeavingKey, p: Partial<LeavingCfg>) =>
    setS((x) => ({ ...x, leaving: { ...x.leaving, [k]: { ...x.leaving[k], ...p } } }));

  async function onFileLeaving(k: LeavingKey, f?: File) {
    if (!f) return;
    try {
      await saveAudio(`leaving-${k}`, f);
      updLeaving(k, { fileName: f.name, title: f.name });
      setLog(`${LEAVING_LABELS[k]}: ${f.name} tersimpan di perangkat ini.`);
      if (navigator.storage?.persist) void navigator.storage.persist().catch(() => {});
    } catch { setLog("Audio gagal disimpan. Periksa ruang penyimpanan perangkat dan coba kembali."); }
  }

  async function downloadBackup() {
    setBackupBusy(true);
    try {
      const bytes = await createBackup(s);
      const url = URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: "application/zip" }));
      const link = document.createElement("a");
      link.href = url; link.download = `Cadangan-Sound-BPOM-${new Date().toISOString().slice(0, 10)}.zip`;
      link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
      setLog("Cadangan jadwal dan audio berhasil diunduh.");
    } catch { setLog("Cadangan gagal dibuat. Coba kembali sebelum menutup aplikasi."); }
    finally { setBackupBusy(false); }
  }

  async function selectBackup(file?: File) {
    if (!file) return;
    setBackupBusy(true);
    try { setPendingBackup(await readBackup(file)); }
    catch { setLog("Cadangan tidak valid atau audio tidak lengkap. Data lama tidak diubah."); }
    finally { setBackupBusy(false); }
  }

  async function confirmRestore() {
    if (!pendingBackup) return;
    setBackupBusy(true);
    stop();
    try {
      const settings = await restoreBackup(pendingBackup);
      setS(settings); setPendingBackup(null);
      setLog("Jadwal dan seluruh audio berhasil dipulihkan di perangkat ini.");
    } catch { setLog("Pemulihan gagal. Periksa ruang penyimpanan lalu coba kembali."); }
    finally { setBackupBusy(false); }
  }

  const time = now ? now.toLocaleTimeString("id-ID", { hour12: false }).replace(/\./g, ":") : "00:00:00";
  const date = now ? now.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : "";
  const today = now?.getDay();
  const leavingToday = today !== undefined && today >= 1 && today <= 4 ? LEAVING_SLOTS.filter((k) => s.leaving[k].enabled) : [];

  return (
    <div className="min-h-dvh bg-background font-sans">
      <div className="h-1.5 flex"><div className="flex-1 bg-destructive" /><div className="flex-1 bg-card" /><div className="flex-1 bg-primary" /></div>
      <header className="bg-primary text-primary-foreground">
        <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-start gap-3 px-4 py-4 sm:items-center sm:gap-5 sm:px-6 sm:py-5">
          <div className="flex min-w-0 items-start gap-3 sm:items-center sm:gap-4">
          <img src={soundLogo} alt="Logo Sound" width={72} height={72} className="h-11 w-11 sm:h-18 sm:w-18 shrink-0 object-contain" />
          <div className="min-w-0">
            <p className="hidden text-xs uppercase opacity-80 sm:block">Badan Pengawas Obat dan Makanan</p>
            <h1 className="text-base sm:text-2xl md:text-[28px] leading-snug font-extrabold">Sistem Sound Otomatis Kantor BPOM Tanjung Balai</h1>
            {offline && (
              <p role="status" className="mt-1.5 inline-flex items-center gap-2 text-xs font-semibold">
                <span className="h-2 w-2 shrink-0 rounded-full bg-success" />
                Mode: Offline (Siap beroperasi tanpa internet)
              </p>
            )}
          </div>
          </div>
          <Button onClick={() => setGuide(true)} aria-label="Panduan" title="Panduan" variant="outline" className="h-11 w-11 shrink-0 border-primary-foreground/40 bg-transparent p-0 text-primary-foreground sm:w-auto sm:px-4">
            <HelpCircle /> <span className="hidden sm:inline">Panduan</span>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-5 sm:py-8 space-y-7 pb-[max(2rem,env(safe-area-inset-bottom))]">
        <section className="grid min-w-0 gap-4 lg:gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <div className="rounded-lg bg-card border p-4 sm:p-8 shadow-sm">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 sm:gap-4">
              <div className="min-w-0">
                <p className="text-sm sm:text-base text-muted-foreground font-semibold capitalize">{date}</p>
                <p className="font-mono text-2xl sm:text-5xl lg:text-[42px] xl:text-[52px] font-bold text-primary tabular-nums my-3 whitespace-nowrap">{time}</p>
              </div>
              <img src={bpomLogo.url} alt="Logo Badan POM" width={144} height={160} className="h-24 w-[72px] shrink-0 object-contain sm:h-40 sm:w-36" />
            </div>
            <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 mt-4">
              <span className={`h-3 w-3 shrink-0 rounded-full ${s.active ? "bg-success motion-safe:animate-pulse" : "bg-muted-foreground/40"}`} />
              <span className="text-base sm:text-lg font-bold">
                {s.active ? "AKTIF: Standby menunggu jadwal" : "NONAKTIF: Jadwal tidak berjalan"}
              </span>
            </div>
            {today !== undefined && s.days[today]?.enabled && (
              <p className="mt-2 text-muted-foreground break-words">Jadwal hari ini: <b className="text-foreground">{s.days[today].time}</b>, {s.days[today].title}</p>
            )}
            {leavingToday.length > 0 && (
              <div className="mt-2 space-y-1 text-sm text-muted-foreground">{leavingToday.map((k) => <p key={k}>{LEAVING_LABELS[k]}: {[s.leaving[k].time, s.leaving[k].repeatTime].filter(Boolean).join(" dan ")}</p>)}</div>
            )}
            {playing && <p className="mt-3 rounded-lg bg-accent px-4 py-2 font-semibold text-accent-foreground break-all">▶ Sedang diputar: {playing}</p>}
            {log && <p role="status" className="mt-3 text-sm text-muted-foreground break-all">{log}</p>}
          </div>

          <div className="flex flex-col gap-4">
            <Button
              onClick={() => setS((x) => ({ ...x, active: !x.active }))}
              className={`h-auto min-h-20 whitespace-normal rounded-lg px-4 py-5 text-lg font-extrabold shadow-sm transition ${s.active ? "bg-secondary text-secondary-foreground border-2 border-primary" : "bg-primary text-primary-foreground hover:opacity-90"}`}
            >
              {s.active ? <Pause /> : <Play />} {s.active ? "Matikan Jadwal" : "Aktifkan Jadwal Otomatis"}
            </Button>
            <Button onClick={stop} variant="destructive" className="h-auto min-h-24 whitespace-normal rounded-lg px-4 py-6 text-xl font-extrabold">
              <Square /> STOP AUDIO SEKARANG
            </Button>
            <div className="rounded-lg border bg-card p-5 space-y-4">
              <label className="block">
                <span className="font-semibold">Volume: {Math.round(s.volume * 100)}%</span>
                <input type="range" min={0} max={1} step={0.05} value={s.volume}
                  onChange={(e) => setS((x) => ({ ...x, volume: +e.target.value }))}
                  className="w-full accent-[var(--primary)] mt-2" />
              </label>
              <Toggle label="Cegah sleep / speaker standby" hint="Memutar sinyal senyap agar speaker bluetooth tidak mati" checked={s.keepAlive} onChange={(v) => setS((x) => ({ ...x, keepAlive: v }))} />
              <Toggle label="Layar tetap menyala" hint="Mencegah layar perangkat mati otomatis" checked={s.wakeLock} onChange={(v) => setS((x) => ({ ...x, wakeLock: v }))} />
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-xl sm:text-2xl font-extrabold mb-4">Jadwal Mingguan</h2>
          <div className="grid gap-3">
            {ORDER.map((d) => {
              const c = s.days[d];
               if (!c) return null;
              return (
                <div key={d} className={`min-w-0 rounded-lg border bg-card p-4 grid gap-4 grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:grid-cols-[140px_120px_minmax(0,1fr)_auto] items-center ${today === d ? "ring-2 ring-primary" : ""} ${c.enabled ? "" : "opacity-60"}`}>
                  <div className="flex items-center gap-3">
                    <Switch label={`Jadwal ${DAYS[d]}`} checked={c.enabled} onChange={(v) => upd(d, { enabled: v })} />
                    <span className="font-bold text-lg">{DAYS[d]}</span>
                  </div>
                  <input type="time" aria-label={`Jam ${DAYS[d]}`} value={c.time} onChange={(e) => upd(d, { time: e.target.value })}
                    className="min-w-0 w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-lg font-bold" />
                  <div className="col-span-2 min-w-0 lg:col-span-1">
                    <p className="font-semibold break-all">{c.fileName ?? "Belum ada audio"}</p>
                    <div className="mt-2 flex flex-wrap gap-3 items-center text-sm">
                      <FilePicker label={`Audio ${DAYS[d]}`} accept={AUDIO_ACCEPT} onSelect={(file) => void onFile(d, file)}>{c.fileName ? "Ganti audio" : "Pilih audio"}</FilePicker>
                      {c.fileName ? (
                        <Button variant="ghost" className="h-auto p-0 text-destructive hover:underline" onClick={async () => { try { await deleteAudio(`day-${d}`); upd(d, { fileName: undefined, title: "Belum ada audio" }); } catch { setLog("Audio gagal dihapus. Coba kembali."); } }}>Hapus</Button>
                      ) : <span className="text-muted-foreground">(belum ada file)</span>}
                    </div>
                  </div>
                  <Button onClick={() => play(d)} variant="secondary" className="col-span-2 h-11 px-5 font-bold lg:col-span-1">
                    <Play /> Test Putar
                  </Button>
                </div>
              );
            })}
          </div>
        </section>
        <section>
          <h2 className="text-xl sm:text-2xl font-extrabold mb-1">Jadwal Sound Pulang</h2>
          <p className="text-sm text-muted-foreground mb-4">Diputar otomatis setiap hari kerja Senin sampai Kamis.</p>
          <div className="grid gap-3">
            {LEAVING_SLOTS.map((k) => {
              const c = s.leaving[k];
              const name = c.fileName ? `${LEAVING_LABELS[k]}: ${c.fileName}` : LEAVING_LABELS[k];
              return (
                <div key={k} className={`min-w-0 rounded-lg border bg-card p-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-center ${c.enabled ? "" : "opacity-60"}`}>
                  <div className="flex min-w-0 items-center gap-3 lg:col-span-3">
                    <Switch label={`Jadwal ${LEAVING_LABELS[k]}`} checked={c.enabled} onChange={(v) => updLeaving(k, { enabled: v })} />
                    <span className="font-bold text-lg">{LEAVING_LABELS[k]}</span>
                  </div>
                  <div className="grid min-w-0 grid-cols-2 items-end gap-3">
                    <label className="min-w-0"><span className="mb-1 block text-sm font-semibold">Putar pertama</span>
                      <input type="time" aria-label={`Jam ${LEAVING_LABELS[k]}`} value={c.time} onChange={(e) => updLeaving(k, { time: e.target.value })}
                        className="min-w-0 w-full h-11 rounded-md border border-input bg-background px-2 py-2 font-mono text-base font-bold" />
                    </label>
                    <label className="min-w-0"><span className="mb-1 block text-sm font-semibold">Putar kedua</span>
                      <input type="time" aria-label={`Jam kedua ${LEAVING_LABELS[k]}`} value={c.repeatTime} onChange={(e) => updLeaving(k, { repeatTime: e.target.value })}
                        className="min-w-0 w-full h-11 rounded-md border border-input bg-background px-2 py-2 font-mono text-base font-bold" />
                    </label>
                    {c.repeatTime && <Button variant="ghost" className="col-span-2 h-11 text-destructive" onClick={() => updLeaving(k, { repeatTime: "" })}>Hapus waktu kedua</Button>}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold break-all">{c.fileName ?? "Belum ada audio"}</p>
                    <div className="mt-2 flex flex-wrap gap-3 items-center text-sm">
                      <FilePicker label={`Audio ${LEAVING_LABELS[k]}`} accept={AUDIO_ACCEPT} onSelect={(file) => void onFileLeaving(k, file)}>{c.fileName ? "Ganti audio" : "Pilih audio"}</FilePicker>
                      {c.fileName ? (
                        <Button variant="ghost" className="h-auto p-0 text-destructive hover:underline" onClick={async () => { try { await deleteAudio(`leaving-${k}`); updLeaving(k, { fileName: undefined, title: "Belum ada audio" }); } catch { setLog("Audio gagal dihapus. Coba kembali."); } }}>Hapus</Button>
                      ) : <span className="text-muted-foreground">(belum ada file)</span>}
                    </div>
                  </div>
                  <Button onClick={() => void playAudio(`leaving-${k}`, name, "Test putar")} variant="secondary" className="h-11 px-5 font-bold">
                    <Play /> Test Putar
                  </Button>
                </div>
              );
            })}
          </div>
        </section>
        <section className="border-t pt-6 space-y-4">
          <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <h2 className="text-xl font-extrabold">Cadangan Jadwal & Audio</h2>
            <div className="grid min-w-0 gap-3 sm:grid-cols-2">
              <Button className="h-11" disabled={!loaded || backupBusy} onClick={downloadBackup}><Download /> Unduh Cadangan</Button>
              <FilePicker label="File cadangan" accept=".zip,application/zip" disabled={backupBusy} onSelect={(file) => void selectBackup(file)}>Pulihkan Cadangan</FilePicker>
            </div>
          </div>
          <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground"><ShieldCheck className="h-4 w-4 shrink-0" />{backupBusy ? "Memproses cadangan…" : saved ? "Jadwal tersimpan otomatis di perangkat ini." : "Menyiapkan penyimpanan…"}</p>
          <p className="text-sm text-muted-foreground">Audio dan jadwal tetap tersimpan setelah aplikasi ditutup. Cadangan dapat dipulihkan di perangkat lain tanpa internet. Hindari menghapus data situs atau memakai mode privat.</p>
          <p className="text-sm text-muted-foreground">Pemutaran otomatis memerlukan aplikasi tetap terbuka dan perangkat menyala; suara tidak berjalan saat aplikasi ditutup.</p>
        </section>
      </main>

      {pendingBackup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 p-4">
          <div role="dialog" aria-modal="true" aria-labelledby="restore-title" className="w-full max-w-md rounded-lg bg-card p-6 shadow-xl">
            <h3 id="restore-title" className="text-xl font-bold">Pulihkan cadangan?</h3>
            <p className="mt-3 text-muted-foreground">Cadangan ini berisi jadwal pagi, jadwal sound pulang beserta waktu keduanya, dan {Object.keys(pendingBackup.audio).length} audio. Jadwal dan audio saat ini akan diganti.</p>
            <div className="mt-6 flex flex-wrap gap-3 justify-end">
              <Button variant="outline" disabled={backupBusy} onClick={() => setPendingBackup(null)}>Batal</Button>
              <Button disabled={backupBusy} onClick={confirmRestore}><Upload /> Pulihkan Sekarang</Button>
            </div>
          </div>
        </div>
      )}
      {guide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 p-4" onClick={() => setGuide(false)}>
          <div className="max-w-md w-full max-h-[90dvh] overflow-y-auto rounded-lg bg-card p-6 sm:p-8 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-2xl font-extrabold mb-5">Panduan Singkat</h3>
            {["Hubungkan speaker bluetooth ke perangkat.", "Pilih lagu & jam untuk setiap hari, lalu klik \"Aktifkan Jadwal Otomatis\".", "Biarkan aplikasi tetap terbuka dan layar menyala."].map((t, i) => (
              <div key={i} className="flex gap-4 mb-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary font-bold text-primary-foreground">{i + 1}</span>
                <p className="pt-1.5 font-medium">{t}</p>
              </div>
            ))}
            <p className="mt-5 border-t border-border pt-4 text-center text-sm font-semibold text-muted-foreground">Dibuat Oleh PT Coodlex Technology Indonesia</p>
            <Button onClick={() => setGuide(false)} className="mt-2 w-full rounded-lg bg-primary py-3 font-bold text-primary-foreground">Mengerti</Button>
          </div>
        </div>
      )}
    </div>
  );
}

function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <Button variant="ghost" aria-label={label} role="switch" aria-checked={checked} onClick={() => onChange(!checked)}
      className={`relative h-7 w-12 p-0 shrink-0 rounded-full transition hover:opacity-90 ${checked ? "bg-success" : "bg-muted-foreground/30"}`}>
      <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-card shadow transition-all ${checked ? "left-[22px]" : "left-0.5"}`} />
    </Button>
  );
}

function Toggle({ label, hint, checked, onChange }: { label: string; hint: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
      <div className="min-w-0"><p className="font-semibold">{label}</p><p className="text-xs text-muted-foreground">{hint}</p></div>
      <Switch label={label} checked={checked} onChange={onChange} />
    </div>
  );
}
