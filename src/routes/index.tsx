import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { saveAudio, getAudio, deleteAudio } from "@/lib/audio-db";
import { registerAppSW } from "@/lib/sw-register";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sistem Sound Otomatis — BPOM Tanjung Balai" },
      { name: "description", content: "Pemutar audio terjadwal otomatis untuk Kantor BPOM Tanjung Balai, bekerja offline." },
      { property: "og:title", content: "Sistem Sound Otomatis — BPOM Tanjung Balai" },
      { property: "og:description", content: "Pemutar audio terjadwal otomatis, bekerja offline." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

const DAYS = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const ORDER = [1, 2, 3, 4, 5, 6, 0];

type DayCfg = { enabled: boolean; time: string; title: string; fileName?: string | undefined };
type Settings = { active: boolean; volume: number; keepAlive: boolean; wakeLock: boolean; days: Record<number, DayCfg> };

const DEFAULTS: Settings = {
  active: false,
  volume: 0.8,
  keepAlive: true,
  wakeLock: false,
  days: {
    1: { enabled: true, time: "10:00", title: "Instrumen - Hymne Universitas Royal" },
    2: { enabled: true, time: "10:00", title: "Instrumen - Indonesia Raya" },
    3: { enabled: true, time: "10:00", title: "Instrumen - Mars Universitas Royal" },
    4: { enabled: true, time: "10:00", title: "Instrumen Jalan" },
    5: { enabled: false, time: "16:00", title: "Belum dipilih" },
    6: { enabled: false, time: "16:00", title: "Belum dipilih" },
    0: { enabled: false, time: "16:00", title: "Belum dipilih" },
  },
};
const LS = "bpom-sound-settings";

function Index() {
  const [s, setS] = useState<Settings>(DEFAULTS);
  const [loaded, setLoaded] = useState(false);
  const [now, setNow] = useState<Date | null>(null);
  const [playing, setPlaying] = useState<string | null>(null);
  const [guide, setGuide] = useState(false);
  const [log, setLog] = useState<string>("");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const wakeRef = useRef<WakeLockSentinel | null>(null);
  const firedRef = useRef<string>("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS);
      if (raw) {
        const p = JSON.parse(raw);
        setS({ ...DEFAULTS, ...p, days: { ...DEFAULTS.days, ...p.days } });
      } else setGuide(true);
    } catch {}
    setLoaded(true);
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    registerAppSW();
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (loaded) localStorage.setItem(LS, JSON.stringify(s));
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

  // Scheduler
  useEffect(() => {
    if (!now || !s.active) return;
    const d = now.getDay();
    const cfg = s.days[d];
    const hm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    const key = `${now.toDateString()}-${hm}`;
    if (cfg?.enabled && cfg.time === hm && firedRef.current !== key) {
      firedRef.current = key;
      play(d, true);
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

  async function play(day: number, auto = false) {
    stop();
    const cfg = s.days[day]!;
    const blob = await getAudio(`day-${day}`);
    const stamp = new Date().toLocaleTimeString("id-ID");
    if (!blob) {
      chime();
      setLog(`${stamp} — ${DAYS[day]}: belum ada file audio, memutar nada uji.`);
      return;
    }
    const a = new Audio(URL.createObjectURL(blob));
    a.volume = s.volume;
    a.onended = () => setPlaying(null);
    audioRef.current = a;
    try {
      await a.play();
      setPlaying(cfg.title);
      setLog(`${stamp} — ${auto ? "Jadwal otomatis" : "Test putar"}: ${cfg.title}`);
    } catch {
      setLog(`${stamp} — Gagal memutar. Klik sekali di halaman agar browser mengizinkan suara.`);
    }
  }

  function stop() {
    if (audioRef.current) {
      audioRef.current.pause();
      URL.revokeObjectURL(audioRef.current.src);
      audioRef.current = null;
    }
    setPlaying(null);
  }

  const upd = (d: number, p: Partial<DayCfg>) =>
    setS((x) => ({ ...x, days: { ...x.days, [d]: { ...x.days[d]!, ...p } as DayCfg } }));

  async function onFile(d: number, f?: File) {
    if (!f) return;
    await saveAudio(`day-${d}`, f);
    upd(d, { fileName: f.name, title: f.name.replace(/\.[^.]+$/, "") });
  }

  const time = now ? now.toLocaleTimeString("id-ID", { hour12: false }).replace(/\./g, ":") : "--:--:--";
  const date = now ? now.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : "";
  const today = now?.getDay();

  return (
    <div className="min-h-screen bg-background font-sans">
      <div className="h-1.5 flex"><div className="flex-1 bg-destructive" /><div className="flex-1 bg-card" /><div className="flex-1 bg-primary" /></div>
      <header className="bg-primary text-primary-foreground">
        <div className="mx-auto max-w-6xl px-6 py-5 flex items-center gap-4">
          <img src="/favicon.png" alt="" width={44} height={44} className="rounded-lg" />
          <div className="flex-1">
            <p className="text-xs uppercase tracking-widest opacity-80">Badan Pengawas Obat dan Makanan</p>
            <h1 className="text-xl md:text-2xl font-extrabold">Sistem Sound Otomatis — Kantor BPOM Tanjung Balai</h1>
          </div>
          <button onClick={() => setGuide(true)} className="rounded-lg border border-primary-foreground/40 px-4 py-2 text-sm font-semibold hover:bg-primary-foreground/10">
            Panduan
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8 space-y-8">
        <section className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <div className="rounded-2xl bg-card border p-8 shadow-sm">
            <p className="text-muted-foreground font-semibold capitalize">{date}</p>
            <p className="font-mono text-6xl md:text-8xl font-bold text-primary tabular-nums tracking-tight my-2">{time}</p>
            <div className="flex items-center gap-3 mt-4">
              <span className={`h-4 w-4 rounded-full ${s.active ? "bg-success animate-pulse" : "bg-muted-foreground/40"}`} />
              <span className="text-lg font-bold">
                {s.active ? "AKTIF — Standby menunggu jadwal" : "NONAKTIF — Jadwal tidak berjalan"}
              </span>
            </div>
            {today !== undefined && s.days[today]?.enabled && (
              <p className="mt-2 text-muted-foreground">Jadwal hari ini: <b className="text-foreground">{s.days[today].time}</b> — {s.days[today].title}</p>
            )}
            {playing && <p className="mt-3 rounded-lg bg-accent px-4 py-2 font-semibold text-accent-foreground">▶ Sedang diputar: {playing}</p>}
            {log && <p className="mt-3 text-sm text-muted-foreground">{log}</p>}
          </div>

          <div className="flex flex-col gap-4">
            <button
              onClick={() => setS((x) => ({ ...x, active: !x.active }))}
              className={`rounded-2xl py-6 text-xl font-extrabold shadow-sm transition ${s.active ? "bg-secondary text-secondary-foreground border-2 border-primary" : "bg-primary text-primary-foreground hover:opacity-90"}`}
            >
              {s.active ? "⏸ Matikan Jadwal" : "▶ Aktifkan Jadwal Otomatis"}
            </button>
            <button onClick={stop} className="rounded-2xl bg-destructive py-8 text-2xl font-extrabold text-destructive-foreground shadow-lg hover:opacity-90 active:scale-[0.98]">
              ■ STOP AUDIO SEKARANG
            </button>
            <div className="rounded-2xl border bg-card p-5 space-y-4">
              <label className="block">
                <span className="font-semibold">Volume: {Math.round(s.volume * 100)}%</span>
                <input type="range" min={0} max={1} step={0.05} value={s.volume}
                  onChange={(e) => setS((x) => ({ ...x, volume: +e.target.value }))}
                  className="w-full accent-[var(--primary)] mt-2" />
              </label>
              <Toggle label="Cegah sleep / speaker standby" hint="Memutar sinyal senyap agar speaker bluetooth tidak mati" checked={s.keepAlive} onChange={(v) => setS((x) => ({ ...x, keepAlive: v }))} />
              <Toggle label="Layar tetap menyala" hint="Mencegah layar komputer mati otomatis" checked={s.wakeLock} onChange={(v) => setS((x) => ({ ...x, wakeLock: v }))} />
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-extrabold mb-4">Jadwal Mingguan</h2>
          <div className="grid gap-3">
            {ORDER.map((d) => {
              const c = s.days[d]!;
              return (
                <div key={d} className={`rounded-xl border bg-card p-4 grid gap-4 md:grid-cols-[140px_120px_1fr_auto] items-center ${today === d ? "ring-2 ring-primary" : ""} ${c.enabled ? "" : "opacity-60"}`}>
                  <div className="flex items-center gap-3">
                    <Switch checked={c.enabled} onChange={(v) => upd(d, { enabled: v })} />
                    <span className="font-bold text-lg">{DAYS[d]}</span>
                  </div>
                  <input type="time" value={c.time} onChange={(e) => upd(d, { time: e.target.value })}
                    className="rounded-lg border border-input bg-background px-3 py-2 font-mono text-lg font-bold" />
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{c.title}</p>
                    <div className="flex gap-3 items-center text-sm">
                      <label className="cursor-pointer text-primary font-semibold hover:underline">
                        {c.fileName ? "Ganti file audio" : "Pilih file audio…"}
                        <input type="file" accept="audio/*" className="hidden" onChange={(e) => onFile(d, e.target.files?.[0])} />
                      </label>
                      {c.fileName ? (
                        <button className="text-destructive hover:underline" onClick={async () => { await deleteAudio(`day-${d}`); upd(d, { fileName: undefined }); }}>Hapus</button>
                      ) : <span className="text-muted-foreground">(belum ada file)</span>}
                    </div>
                  </div>
                  <button onClick={() => play(d)} className="rounded-lg bg-secondary px-5 py-3 font-bold text-secondary-foreground hover:bg-accent">
                    ▶ Test Putar
                  </button>
                </div>
              );
            })}
          </div>
        </section>
        <p className="text-center text-sm text-muted-foreground">Semua pengaturan & file audio tersimpan otomatis di komputer ini dan bekerja tanpa internet.</p>
      </main>

      {guide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 p-4" onClick={() => setGuide(false)}>
          <div className="max-w-md w-full rounded-2xl bg-card p-8 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-2xl font-extrabold mb-5">Panduan Singkat</h3>
            {["Hubungkan speaker bluetooth ke komputer.", "Pilih lagu & jam untuk setiap hari, lalu klik \"Aktifkan Jadwal Otomatis\".", "Biarkan tab ini tetap terbuka (boleh di-minimize)."].map((t, i) => (
              <div key={i} className="flex gap-4 mb-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary font-bold text-primary-foreground">{i + 1}</span>
                <p className="pt-1.5 font-medium">{t}</p>
              </div>
            ))}
            <button onClick={() => setGuide(false)} className="mt-2 w-full rounded-lg bg-primary py-3 font-bold text-primary-foreground">Mengerti</button>
          </div>
        </div>
      )}
    </div>
  );
}

function Switch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button role="switch" aria-checked={checked} onClick={() => onChange(!checked)}
      className={`relative h-7 w-12 shrink-0 rounded-full transition ${checked ? "bg-success" : "bg-muted-foreground/30"}`}>
      <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-card shadow transition-all ${checked ? "left-[22px]" : "left-0.5"}`} />
    </button>
  );
}

function Toggle({ label, hint, checked, onChange }: { label: string; hint: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div><p className="font-semibold">{label}</p><p className="text-xs text-muted-foreground">{hint}</p></div>
      <Switch checked={checked} onChange={onChange} />
    </div>
  );
}
