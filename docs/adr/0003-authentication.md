# ADR-0003: Authentifizierung und Authorization

- **Status:** Accepted
- **Date:** 2026-05-06

## Context

Mit User-generated Content (Favoriten, Kommentare, Reactions) braucht skillup.dev Auth. Zielgruppe sind Programmier-Lernende — Devs sind in der Regel auf GitHub. Außerdem braucht es eine Admin-Rolle für Content-Pflege via UI.

Drei Achsen-Entscheidungen: **Identity-Source**, **Session-Mechanik**, **Authorization-Modell**.

## Decision

### Identity-Source: GitHub-OAuth

- **Library:** `arctic` (OAuth-Provider) + `oslo` (Crypto-Helper) ODER `lucia-auth` (battery-included). Wahl liegt beim Implementer in Slice 3.
- **Flow:** Server-side OAuth-Code-Flow. Frontend-Login-Button ist `<a href="/api/auth/github">` (Full-Browser-Navigate, kein XHR — Cookie-Set funktioniert nur so).
- **Callback:** `/api/auth/github/callback` tauscht Code, holt User-Info von GitHub, upsertet `users`-Row, erstellt Session-Row, setzt Cookie, redirected zu `/`.

### Session-Mechanik: Server-Sessions in Postgres + httpOnly-Cookie

- **`sessions`-Tabelle:** `id` (random opaque), `user_id`, `expires_at`, `created_at`.
- **Cookie:** Session-ID, `HttpOnly; Secure; SameSite=Lax; Domain=.skillup.dev` (in Prod). In Dev: `Domain` weglassen, lockerer.
- **Logout:** `POST /api/auth/logout` — DELETE Session-Row, Cookie clear.
- **Auto-Expire:** TTL via `expires_at`. Background-Job optional zum periodischen Aufräumen abgelaufener Rows.

### Authorization: Role-Spalte auf `users`

- **`users.role`:** Postgres-Enum `user_role` mit Werten `'user' | 'admin'`. Default `'user'`.
- **Hono-Middleware:**
  - `requireAuth` — checked Session-Cookie, lädt User, antwortet 401 wenn nicht eingeloggt.
  - `requireAdmin` — chained nach `requireAuth`, antwortet 403 wenn `role !== 'admin'`.
- **First-Admin-Setup:** Manuell nach erstem Login via SQL: `UPDATE users SET role='admin' WHERE github_login = '<your-login>'`. Dokumentiert in CONTEXT.md.

### Frontend-State

- **`useGetMeQuery()`** ist die Source-of-Truth für den eingeloggten User. RTK-Query-Endpoint mit Tag `'Me'`, antwortet `{user: User} | {user: null}` (200 in beiden Fällen, kein 401-Error-State für Anon).
- **Logout-Mutation** invalidiert Tag `'Me'` → Refetch zeigt `{user: null}`.
- **401 auf andere Endpoints** (Session abgelaufen mid-flight) → custom `baseQuery` invalidiert `'Me'`-Tag → UI zeigt re-login-Prompt.
- **Keine Auth-Slice** in Redux. User ist Server-State, gehört in RTK-Query.

### CSRF-Schutz

- `SameSite=Lax`-Cookie + Origin-Header-Check in Hono-Middleware für state-changing Methods (POST/PATCH/DELETE). Reicht in 2026 ohne separate CSRF-Token-Mechanik.

## Consequences

### Positive

- **Null Passwort-Lifecycle.** Kein Hashing, kein Reset, keine Email-Verification, kein Mail-Provider nötig.
- **GitHub-Login passt zur Zielgruppe.** Devs haben ohnehin GitHub-Accounts.
- **Sofortige Logout-Wirksamkeit.** DB-Row-Delete = Session weg. Keine Token-Blacklist-Komplexität wie bei JWT.
- **httpOnly-Cookie ist XSS-resistent.** Session-Token nicht via `document.cookie` abrufbar.
- **`SameSite=Lax` + Origin-Check** ist 2026er-Standard für SPA+API-Cookies.
- **Role-Spalte einfach erweiterbar.** Falls zweiter Admin oder Moderator-Rolle dazukommt: Enum-Wert hinzufügen, kein Code-Refactor.

### Negative / Trade-offs

- **GitHub-Account ist Login-Voraussetzung.** Lock-out für User ohne GitHub. Akzeptabel für eine Dev-Lern-Plattform.
- **DB-Roundtrip pro authenticated Request** (Session-Lookup). Bei skillup.dev-Volumen irrelevant; bei Skala wäre Redis-Cache eine Option.
- **OAuth-App-Setup ist HITL.** Slice 3 kann nicht ohne manuelle GitHub-OAuth-App-Registrierung mergen. Dokumentiert im Issue.
- **`SameSite=Lax` blockiert nicht alle CSRF-Vektoren** (z.B. method-override-Tricks). Daher die zusätzliche Origin-Header-Prüfung.

## Alternatives Considered

- **JWT in httpOnly-Cookie:** Stateless, kein DB-Roundtrip. Verworfen wegen Revoke-Komplexität (Blacklist-DB nötig → wieder stateful) und Refresh-Token-Dance.
- **JWT im LocalStorage + Authorization-Header:** Verworfen. XSS-leakt das Token. Modern-Security-Konsens rät davon ab.
- **Email + Passwort:** Verworfen. Voller Passwort-Lifecycle (Hashing, Reset, Verification, Mail-Provider) ist Aufwand ohne Mehrwert für die Zielgruppe.
- **Magic-Link:** Verworfen. Mail-Service nötig, UX-Friction durch Tab-Switch.
- **Supabase-Auth:** Verworfen. Wertet das Stack auf (mehr Features), koppelt aber stark an Supabase-Vendor — kollidiert mit der Multi-Vendor-Topologie aus ADR-0006.
- **`SameSite=Strict`:** Verworfen. Bricht GitHub-OAuth-Redirect (Cross-Site-Navigation setzt Strict-Cookie nicht beim ersten Hit). Workaround mit dual-Cookies wäre möglich, aber unnötig komplex.
- **Permissions-Tabelle (granular `can_*`):** Verworfen. Premature für ein Solo-Projekt mit einem Admin. Role-Enum reicht; granulare Permissions nachrüstbar wenn nötig.
- **Single-Admin per Env-Var (`ADMIN_GITHUB_ID=42`):** Verworfen. Zu rigide, koppelt Authorization an Environment-Konfig statt an Daten. Role-Spalte bietet Wachstumspfad.
