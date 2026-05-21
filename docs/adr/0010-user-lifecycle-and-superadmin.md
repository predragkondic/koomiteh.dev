# ADR-0010: User-Lifecycle-Zustände und Superadmin-Rolle

- **Status:** Proposed
- **Date:** 2026-05-21

## Context

ADR-0003 etablierte `users.role` als Enum `'user' | 'admin'` und Soft-Delete via `deletedAt`. Mit Issue #83 kommen zwei neue Anforderungen:

1. Admins müssen User suspendieren und wieder freischalten können (UI-Action in der Admin-User-Tabelle).
2. "Echte Admins" sollen "normale Admins" sperren können — eine privilegiertere Rolle ist nötig.

Beide Anforderungen erfordern Schema- und Authorization-Erweiterungen. Außerdem zeichnen sich weitere User-Zustände am Horizont ab (`hiddenAt` für User-imposed Privacy, `confirmedAt` falls Email-Auth später dazukommt), die wir im Schema-Design nicht antizipieren wollen, aber auch nicht behindern.

## Decision

### Lifecycle-Zustände als orthogonale Timestamps

Neue Spalte:

```sql
suspended_at timestamptz  -- NULL = aktiv, non-NULL = suspendiert (admin-imposed)
```

Konsistent mit dem bestehenden `deleted_at`-Pattern. **Kein** Status-Enum à la `(active|suspended|hidden|unconfirmed)`, weil die Zustände auf orthogonalen Achsen liegen — ein User könnte zukünftig gleichzeitig `suspendedAt` (admin-imposed) und `hiddenAt` (user-imposed Privacy) haben. Mit einem Enum müsste man eine Achse ignorieren.

Weitere Lifecycle-Spalten kommen lazy, wenn ihre Features konkret werden.

### Rolle `superadmin`

Enum `user_role` wird erweitert:

```sql
ALTER TYPE user_role ADD VALUE 'superadmin';
```

Vergabe ausschließlich per SQL, analog zum First-Admin-Pattern aus ADR-0003. Kein UI-Promotion-Flow.

### Suspension Actor Rules

| Aktor | Darf sperren |
|---|---|
| `user` | — (kein Admin-Zugriff) |
| `admin` | nur `role='user'` |
| `superadmin` | `user` + `admin`, **nicht** sich selbst, **nicht** andere `superadmin` |

Verletzungen liefern 403.

### Effekt einer Suspension

- **OAuth-Callback** (`/api/auth/github/callback`): erkennt `suspendedAt != NULL`, erstellt keine Session, redirected mit Error-Flag.
- **`requireAuth`-Middleware**: bei `suspendedAt != NULL` → Session invalidieren, Cookie clearen, 401 antworten.
- **Schreibende Endpoints** (Comments, Reactions, Favorites, Admin-Posts): 403 falls Caller suspendiert.
- **Read-Endpoints** bleiben offen — Anon-Zugriff war ohnehin erlaubt.

## Alternatives Considered

- **Status-Enum `(active|suspended|hidden|unconfirmed)`:** Verworfen. Mischt Achsen (Auth-Status / Admin-Action / User-Privacy). Verliert Orthogonalität — ein User kann nicht gleichzeitig suspended und hidden sein.
- **Suspension = Soft-Delete re-use (`deletedAt` setzen):** Verworfen. Soft-Delete anonymisiert (`githubId=NULL`, `displayName='[deleted]'`). Suspension muss reversibel und verlustfrei sein.
- **UI-basierte Superadmin-Promotion:** Verworfen für jetzt. Erhöht Surface (Audit-Bedarf, Confirm-Flows, Lock-Out-Schutz). SQL-Setup genügt für die aktuelle Skala. Promotion-UI ist nachrüstbar.
- **Single Admin in ENV-Var:** Analog zu ADR-0003 verworfen — zu rigide, koppelt Authorization an Environment-Config statt an Daten.
- **Audit-Tabelle `user_log` jetzt mitbauen:** Deferred. Wird im selben Codepath eingehängt, wenn Audit-Bedarf konkret wird (z.B. wenn ein zweiter Superadmin existiert oder Compliance-Fragen aufkommen).

## Consequences

### Positive

- **Konsistent mit existierendem Pattern.** Timestamps für reversible vs. irreversible Lebenszyklus-Events sind bereits etabliert (`deletedAt`).
- **Orthogonal, zukunftssicher.** Spätere Lifecycle-Spalten (`hiddenAt`, `confirmedAt`) sind additive Schema-Änderungen ohne Datenmigration.
- **Klare Authorization-Hierarchie.** Drei Rollen, expliziter Self/Peer-Schutz beim Superadmin.

### Negative / Trade-offs

- **Kein "Status-Pill" im Admin-UI ohne Computed-View.** Frontend muss aus mehreren Timestamps den darstellungsrelevanten Zustand ableiten (z.B. `if (deletedAt) → "Gelöscht"; else if (suspendedAt) → "Gesperrt"; else → "Aktiv"`). Übersichtlich, aber Logik liegt im Client.
- **Superadmin-Setup ist HITL.** Wie ADR-0003-Admin-Setup: nicht reproduzierbar via Code, nur via SQL. Akzeptabel bei der Skala.
- **Enum-Erweiterung blockt Down-Migration trivial.** Postgres erlaubt `ADD VALUE` ohne Lock, aber kein einfaches `REMOVE VALUE`. Expand-Contract-Pattern relevant falls jemals zurück.

## Migration

Generierte Drizzle-Migration in `apps/api/drizzle/`:

```sql
ALTER TYPE user_role ADD VALUE 'superadmin';
ALTER TABLE users ADD COLUMN suspended_at timestamptz;
```

Beide additiv, kein Downtime-Risiko.
