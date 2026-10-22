<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Offline / PWA
- Derive the header sound logo, favicon and PWA icons from one transparent source and use distinct icon URLs on replacement to avoid stale installed/browser icon caches.
- Store office settings locally and audio in IndexedDB; use a versioned ZIP archive for offline device transfer because Cloud storage cannot meet the offline-first requirement.
- Normalize persisted schedules through the shared settings module; export and restore with the same rules so legacy data cannot reintroduce unsupported days or preset titles.
- The schedule model has per-day morning slots (`day-1`..`day-4`) plus two fixed leaving slots (`leaving-warn`, `leaving-out`); backups stay version 1 with audio entries keyed by these sound IDs and readers accept the older numeric day keys.
- Precache the uploaded logo pointer URL explicitly so branding remains available without internet.
- The service worker must be emitted into `dist/client` (workbox `globDirectory` + `swDest`), because only that folder is served; otherwise `/sw.js` is missing and offline fails.
- The app is server-rendered (no static index.html), so "/" is precached as an `additionalManifestEntries` item and used as `precacheFallback` for NetworkFirst navigations — this is what lets the app open offline.
