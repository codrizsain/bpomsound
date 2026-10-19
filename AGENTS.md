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
- The service worker must be emitted into `dist/client` (workbox `globDirectory` + `swDest`), because only that folder is served; otherwise `/sw.js` is missing and offline fails.
- The app is server-rendered (no static index.html), so "/" is precached as an `additionalManifestEntries` item and used as `precacheFallback` for NetworkFirst navigations — this is what lets the app open offline.
