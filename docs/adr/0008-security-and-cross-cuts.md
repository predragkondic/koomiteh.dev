# ADR-0008: Security-Cross-Cuts und Soft-Delete-Strategie

- **Status:** Accepted
- **Date:** 2026-05-06

## Context

Mehrere security-relevante Entscheidungen bündeln sich quer über die Architektur: CSRF, Rate-Limiting, Input-Sanitization (UGC), GDPR-konforme User-Löschung. Diese werden zusammen entschieden, weil sie einander beeinflussen (z.B. CSRF-Strategie hängt von Cookie-Setup ab, GDPR von Soft-Delete-Strategie).

Außerdem die übergreifende Frage: Hard-Delete vs Soft-Delete pro Entity-Type.

## Decision

### Soft-Delete vs Hard-Delete: Mixed nach Use-Case

| Entity | Strategie | Begründung |
|---|---|---|
| **Post** | Soft-Delete (`deleted_at`) | Permalink-Stabilität (SEO + Bookmarks). Frontend zeigt 410 Gone mit "Diese Frage wurde entfernt". Comments/Favorites bleiben referenziell intakt. Admin-Restore möglich. |
| **Comment** | Soft-Delete (`deleted_at`) | Discussion-Anker stabil. Body wird "[deleted]", Author null. Reactions verlieren keinen Anker. Standard-UX (HN/Reddit/GitHub). |
| **User** | Soft-Delete + Anonymisierung | GDPR-Right-to-be-forgotten: `displayName='[deleted]'`, `githubId=NULL`, `avatarUrl=NULL`, `deleted_at` gesetzt. Sessions gelöscht. Kommentare und Posts (für Admin-User) bleiben mit anonymisiertem Author. Echtes Hard-Delete optional bei explizitem User-Wunsch. |
| **Favorite** | Hard-Delete | Toggle-Operation, kein Audit-Wert. Composite-PK macht Soft-Delete umständlich. |
| **Reaction** | Hard-Delete | Wie Favorite — Toggle, kein Wert in Audit. |
| **Session** | Hard-Delete | Logout = `DELETE FROM sessions`. Audit von Sessions wäre sicherheitsrelevant, aber außerhalb dieses Scopes. |

**Drizzle-Helper:** Custom-Query-Wrapper `notDeleted(table)` → `where(isNull(table.deletedAt))`. Verwendung in jeder Query, die Soft-Deleted-Entities ausschließen soll. Verhindert Vergessens-Bugs.

### CSRF-Schutz

- **Cookie-Konfiguration** (siehe ADR-0003): `SameSite=Lax; Secure; HttpOnly; Domain=.skillup.dev`. Lax blockt Cross-Site-POST-Requests (Browser sendet Cookie nicht bei Cross-Site-Form-Submit/AJAX).
- **Origin-Header-Check** in Hono-Middleware für state-changing Methods (POST/PATCH/DELETE): `Origin === 'https://skillup.dev'` (Prod) oder `'http://localhost:5173'` (Dev). Antwort 403 wenn nicht.
- **Kein separates CSRF-Token.** Double-Submit-Token wäre redundant zu SameSite=Lax. Komplexität ohne Mehrwert in 2026.

### Rate-Limiting

- **Library:** `@hono/rate-limiter` mit In-Memory-Store.
- **Strategie:** IP-basiert für anonyme Endpoints, User-ID-basiert für authenticated Endpoints.
- **Limits:**
  - Auth-Endpoints (`/api/auth/github`, `/api/auth/github/callback`): 5/min pro IP.
  - Comment-Create (`POST /api/posts/:id/comments`): 10/min pro User.
  - Comment-Edit (`PATCH /api/comments/:id`): 30/min pro User.
  - Reaction-Toggle: 60/min pro User.
  - Favorite-Toggle: 60/min pro User.
  - Read-Endpoints (`GET /api/posts*`): 100/min pro IP.
- **In-Memory-Trade-off:** Counter geht bei Process-Restart verloren. Akzeptabel für Anti-Spam/Anti-Brute-Force im Solo-Projekt-Kontext. Kein Redis nötig — würde Vendor-Count erhöhen ohne klaren Mehrwert.

### Input-Sanitization

**Posts (Admin-trusted Content):**

- Keine Sanitization. Admin-Content ist trusted. Frontend rendert mit `marked` + `shiki/bundle/web` → `dangerouslySetInnerHTML`.
- Wenn ein Admin doch böswilligen MD speichern wollte — es wäre das gleiche, als ob ein Admin direkt SQL gegen die DB schicken würde. Kein Schutz nötig.

**Comments (User-untrusted Content):**

- **Server-side Sanitize-Pipeline:** `marked.parse(bodyMd)` → `DOMPurify.sanitize(html, config)` → gespeichert als `body_html_safe`.
- **Whitelist:** `<p>`, `<a target="_blank" rel="noopener">`, `<strong>`, `<em>`, `<code>`, `<pre>`, `<ul>`/`<ol>`/`<li>`, `<blockquote>`.
- **Stripped:** `<script>`, `<iframe>`, `<img>`, `<style>`, alle Event-Handler-Attributes.
- **DOMPurify mit jsdom** für Server-DOM-Provider. Keine Browser-Dependency.
- **Frontend rendert** `body_html_safe` via `dangerouslySetInnerHTML`, danach hookt shiki an die `<pre><code>`-Blöcke für Highlighting.
- **Defense-in-depth (optional):** Frontend könnte zusätzlich `DOMPurify` clientseitig laufen lassen, vor Render. Nicht zwingend, weil Server-Sanitize bereits Wahrheits-Quelle ist.

**Wichtig:** Sanitization läuft **immer** server-side, nicht nur frontend. Falls je ein zweiter Client (Mobile, andere Web-App) gegen die API spricht, wäre Frontend-only-Sanitize XSS-Lücke.

### GDPR-Konformität

- **User-Soft-Delete via Endpoint** `DELETE /api/me` (auth, eigener User):
  - `displayName` → `'[deleted]'`
  - `githubId` → `NULL`
  - `avatarUrl` → `NULL`
  - `deleted_at` → `NOW()`
  - Alle Sessions des Users → DELETE.
  - Posts und Comments des Users bleiben (mit `userId` weiterhin gesetzt, aber lookup zeigt anonymisierten User).
- **User-Hard-Delete** (auf explizite Anfrage):
  - Vollständiges DELETE der Row und referenzierter Comments/Posts (CASCADE oder manuell).
  - Aktuell als manueller Admin-Process, kein Self-Service. Prozess in `docs/operations/` dokumentieren wenn anfällt.
- **Datenbank-Region:** Neon EU-Region wählen für DSGVO-Compliance.
- **Cookie-Consent:** Da skillup.dev nur Session-Cookies nutzt (essentially-functional, keine Tracking-Cookies), ist kein Consent-Banner zwingend. Sentry-DSN ist Server-side-konfigurierter Error-Tracking, kein Tracking-Cookie.

## Consequences

### Positive

- **Mixed Soft/Hard-Delete** ist UX- und compliance-passend. Permalinks stabil, GDPR erfüllt, keine unnötigen `deleted_at`-Spalten auf Toggle-Tables.
- **CSRF-Schutz minimal** (Cookie + Origin-Check) ohne Token-Library-Complexity.
- **Server-Sanitize** schützt zukünftige Clients (Mobile-App, andere Frontends) automatisch.
- **In-Memory-Rate-Limit** ist null-Setup, deckt Solo-Projekt-Volumen vollständig ab.
- **Render-Asymmetrie zwischen Posts und Comments** (siehe ADR-0004) ist security-bewusst und nicht arbiträr.

### Negative / Trade-offs

- **Manueller GDPR-Hard-Delete-Process.** Self-Service-Hard-Delete wäre nutzerfreundlicher, aber implementiert sich aufwändig (CASCADE-Logik, Audit). Akzeptabel solange manuell selten anfällt.
- **Rate-Limit verliert Counter bei Restart.** Ein Restart ist effektiv eine Limit-Reset-Lücke. Akzeptabel (Restart ist seltenes Event).
- **DOMPurify-Library-Updates** sind security-kritisch. Renovate/Dependabot-Auto-Update für Security-Patches einrichten.
- **`notDeleted()`-Helper-Vergessen** könnte Soft-Deleted-Daten in Listing-Endpoints leaken. Linter-Rule oder Code-Review-Praxis nötig.

## Alternatives Considered

- **Hard-Delete überall:** Verworfen für Posts/Comments — bricht Permalinks und Discussion-Threads. GDPR-Hard-Delete für User passt aber als Edge-Case.
- **Soft-Delete überall:** Verworfen für Favorites/Reactions — `deleted_at` bei Toggle-Tabellen unsinnig.
- **Hard-Delete + separate Audit-Log-Tabelle:** Saubere Hauptschemas, aber Mehr-Komplexität ohne klaren Mehrwert. Mixed-Strategy ist schlanker.
- **Double-Submit-CSRF-Token:** Verworfen. Redundant zu SameSite=Lax + Origin-Check. Mehr Code, kein Sicherheitsgewinn.
- **`SameSite=Strict`:** Verworfen — bricht GitHub-OAuth-Redirect (siehe ADR-0003).
- **Postgres-backed Rate-Limit:** Verworfen. Persistent, aber DB-Last pro Request. Overkill.
- **Redis/Upstash für Rate-Limit:** Verworfen. Extra Vendor (vierter), kein klarer Mehrwert über In-Memory bei aktueller Skala.
- **Frontend-only Sanitize für Comments:** Verworfen. Niemals nur Frontend-Sanitize bei UGC. Server-Sanitize schützt alle Konsumenten.
- **Plain-Text-Comments (kein Markdown):** Verworfen, siehe ADR-0004 — Code-Fences sind essentiell für die Zielgruppe.
- **Cookie-Consent-Banner:** Aktuell nicht nötig (nur Functional-Cookies). Falls je Tracking-Cookies (z.B. Analytics) dazukommen, nachrüsten.
