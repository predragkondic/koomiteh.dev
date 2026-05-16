# ADR-0009: PWA-Installable-Shell ohne Service-Worker (Phase 1)

- **Status:** Accepted
- **Date:** 2026-05-16

## Context

Die Web-App soll auf Mobile- und Desktop-Plattformen installierbar werden — eigenes App-Icon im Home-Screen / Launcher, `standalone`-Display, Theme-Color auf Status-Bar/Window-Frame. Cross-Platform-Favicons (Browser-Tab, iOS-Add-to-Home-Screen, Android-Adaptive-Launcher, Windows-Install) müssen konsistent aussehen.

Frage: Brauchen wir dafür schon einen Service-Worker?

Read-Offline (gecachte Posts) und Full-Offline (App-Shell + Daten) sind nice-to-have, aber heute nicht User-Pain-Point. Inhalte sind klein, der Use-Case ist primär online (Q&A-Lookup beim Coden).

## Decision

### Phase 1 — nur Installable-Shell, kein Service-Worker

Scope dieses Slice:

- `manifest.webmanifest` mit `name`, `short_name`, `description`, `start_url`, `display: standalone`, `theme_color`, `background_color` und Icon-Set (192/512 in `any` und `maskable`).
- Icon-Pipeline `apps/web/scripts/build-icons.sh` (ImageMagick) baut alle ausgelieferten Icons reproduzierbar aus den Source-Assets in `apps/web/src/assets/`. Output committed nach `apps/web/public/`.
- `apple-touch-icon.png` (180×180) und iOS-Meta-Tags (`apple-mobile-web-app-*`) für sauberes Add-to-Home-Screen-Verhalten.
- Adaptive `theme-color`-Meta-Tag: wird in [`ThemeContext.tsx`](../../apps/web/src/theme/ThemeContext.tsx) mit dem aktuellen Mode synchronisiert (`#0C0D0F` dark, `#F9FAFC` light — Werte spiegeln `palette.surface.canvas` aus [`theme.ts`](../../apps/web/src/theme/theme.ts)).
- **Kein** `navigator.serviceWorker.register(...)`. Kein SW-File. Keine Caching-Strategie.

### Warum (noch) kein Service-Worker

- **Lifecycle-Komplexität:** Ein einmal registrierter SW bleibt auf User-Geräten installiert, bis er aktiv ein leeres `fetch`-Handler ausliefert oder explizit deregistriert wird. Ein versehentlicher Deploy mit kaputter Cache-Strategie kann eine stale App-Version dauerhaft auf User-Devices "festnageln". Solange wir keine konkrete Caching-Anforderung haben, importieren wir diese Komplexität nicht.
- **Cache-Invalidation-Kosten:** Eine korrekte SW-Strategie (Stale-While-Revalidate für API, Cache-First für Assets, Precache-Versionierung) ist nicht-trivial und will Tests + Monitoring. Heute keine User-Story rechtfertigt das.
- **Installability funktioniert ohne SW:** Chrome akzeptiert seit ~2023 das Install-Prompt rein auf Basis von Manifest + Icons + HTTPS. Ein SW ist für die Install-UX nicht mehr nötig.
- **Lighthouse-PWA-Score:** Die "Installable"-Kriterien werden ohne SW erfüllt. Der frühere "Works offline"-Audit ist nicht mehr Teil des Installability-Blocks.

### Verifizierung

- `navigator.serviceWorker.getRegistrations()` muss auf der deployten Seite `[]` liefern.
- Chrome DevTools → Application → Manifest zeigt alle Icons grün, Maskable-Preview zentriert den Stempel innerhalb des Safe-Area-Kreises auf `#0C0D0F`.
- Lighthouse-PWA-Audit auf `pnpm -F @koomiteh/web build`-Output erfüllt die Installability-Block-Kriterien.

## Consequences

**Akzeptiert:**

- App fühlt sich auf allen Plattformen "installierbar" an, mit korrektem Icon und Standalone-Mode.
- Keine Offline-Fähigkeit. Bei verlorener Verbindung zeigt der Browser seine Standard-Error-Page.
- Keine Asset-Precaches → jeder Cold-Start lädt aus dem CDN. Cloudflare-Pages-CDN ist schnell genug, dass das kein User-Pain ist.

**Verworfen:**

- Vite-PWA-Plugin (Workbox) in Phase 1 — würde sofort einen SW registrieren und uns in den oben genannten Lifecycle-Tradeoff zwingen.

## Roadmap (zukünftige Slices)

- **Phase 2 — Read-Offline:** SW cached zuletzt besuchte Posts (Stale-While-Revalidate für `GET /api/posts/:slug`). User kann offline alte Lookups nachschlagen. Trigger: erste User-Beschwerde über fehlende Offline-Lesbarkeit, oder konkretes Mobile-Use-Case-Signal.
- **Phase 3 — Full-Offline-Shell:** Precache der App-Shell (JS/CSS/Fonts) plus IndexedDB für Comment-Drafts. Trigger: Mobile-User-Anteil rechtfertigt PWA-Native-Parity.

Beide Phasen werden eigene ADRs erhalten mit konkreter Cache-Strategie, Versionierungs- und Kill-Switch-Plan, bevor ein SW deployed wird.
