import { eq, inArray } from 'drizzle-orm';
import { comments, posts, renderCommentBody, users } from '@koomiteh/shared';
import { db, pool } from './db/client.js';
import { logger } from './logger.js';

const SEED_AUTHORS = [
  {
    githubLogin: 'seed-lena',
    displayName: 'Lena Hartmann',
    avatarUrl: null,
    role: 'user' as const,
    githubId: 900_000_001,
  },
  {
    githubLogin: 'seed-peko',
    displayName: 'Peko',
    avatarUrl: null,
    role: 'user' as const,
    githubId: 900_000_002,
  },
  {
    githubLogin: 'seed-marek',
    displayName: 'Marek Voss',
    avatarUrl: null,
    role: 'user' as const,
    githubId: 900_000_003,
  },
  {
    githubLogin: 'seed-sara',
    displayName: 'Sara Lindqvist',
    avatarUrl: null,
    role: 'user' as const,
    githubId: 900_000_004,
  },
  {
    githubLogin: 'seed-tom',
    displayName: 'Tom Becker',
    avatarUrl: null,
    role: 'user' as const,
    githubId: 900_000_005,
  },
];

type CommentSeed = {
  contentId: string;
  authorLogin: string;
  bodyMd: string;
  minutesAgo: number;
  editedMinutesLater?: number;
  softDeleted?: boolean;
};

/**
 * Hand-curated anchor comments matching the design mockup. These are the
 * "showcase" rows; the generator fills the rest around them.
 */
const ANCHORS: CommentSeed[] = [
  {
    contentId: 'typescript-junior-closures',
    authorLogin: 'seed-lena',
    bodyMd:
      'Gute Zusammenfassung. Eine Ergänzung: `queueMicrotask` hat weniger Overhead als `Promise.resolve().then` — kein neues Promise-Objekt, keine Reaktion auf rejection. Direkter Tipp wenn die Promise-Semantik nicht gebraucht wird.',
    minutesAgo: 3 * 24 * 60,
  },
  {
    contentId: 'typescript-junior-closures',
    authorLogin: 'seed-peko',
    bodyMd:
      "Nützlich um die Reihenfolge zu visualisieren:\n\n```ts\nconsole.log('sync');\nPromise.resolve().then(() => console.log('micro'));\nsetTimeout(() => console.log('macro'));\n// sync, micro, macro\n```",
    minutesAgo: 2 * 24 * 60,
    editedMinutesLater: 90,
  },
  {
    contentId: 'typescript-junior-closures',
    authorLogin: 'seed-sara',
    bodyMd: 'Wird hier nichts mehr stehen.',
    minutesAgo: 1 * 24 * 60,
    softDeleted: true,
  },
  {
    contentId: 'typescript-junior-closures',
    authorLogin: 'seed-peko',
    bodyMd: 'Kleine Korrektur: `setImmediate` ist Node-only, nicht im Browser.',
    minutesAgo: 45,
  },
  {
    contentId: 'typescript-junior-closures',
    authorLogin: 'seed-marek',
    bodyMd:
      'Genau das ist die Stelle die Leute im Interview oft falsch sagen. Der microtask-queue wird zwischen macrotasks vollständig entleert.',
    minutesAgo: 30,
  },

  {
    contentId: 'javascript-junior-hoisting',
    authorLogin: 'seed-sara',
    bodyMd:
      'Hoisting für `let` und `const` ist tricky — sie werden gehoist, aber landen in der Temporal Dead Zone bis zur Deklaration. Das `*werden*` bleibt hier übrigens als Plain-Text stehen, weil Comments kein Markdown mehr rendern.',
    minutesAgo: 4 * 24 * 60,
  },
  {
    contentId: 'javascript-junior-hoisting',
    authorLogin: 'seed-tom',
    bodyMd:
      'Hier ein Minimalbeispiel:\n\n```js\nconsole.log(x); // ReferenceError (TDZ)\nlet x = 1;\n```\n\nUnd zum Vergleich `var`:\n\n```js\nconsole.log(y); // undefined (hoisted + initialisiert)\nvar y = 1;\n```',
    minutesAgo: 2 * 24 * 60,
  },

  {
    contentId: 'typescript-senior-variance',
    authorLogin: 'seed-peko',
    bodyMd:
      'Co/Contra-Varianz wird in der Literatur oft mit `+T` / `-T` notiert. TypeScript hat das seit 4.7 als explizite Annotations: `out T` (covariant), `in T` (contravariant), `in out T` (invariant).',
    minutesAgo: 6 * 24 * 60,
    editedMinutesLater: 600,
  },
  {
    contentId: 'typescript-senior-variance',
    authorLogin: 'seed-lena',
    bodyMd:
      'Bivariance bei Function-Parametern (`strictFunctionTypes: false`) ist der häufigste Fußnagelfall. Mit `strictFunctionTypes: true` (default in `strict`) verschwindet das Problem.',
    minutesAgo: 1 * 24 * 60,
  },
];

/** Body templates used by the generator. Round-robin per post (with a post-specific offset). */
const TEMPLATES: string[] = [
  'Guter Punkt. Hatte ich vorher auch falsch verstanden.',
  'Danke für die Klarstellung — hat mir gerade beim aktuellen Bug geholfen.',
  'Bin nicht ganz überzeugt. Im Strict Mode verhält sich das anders.',
  'Praxis-Tipp: bei der Code-Review immer auf diese Stelle achten.',
  'Genau das Beispiel hatte ich gestern im Interview.',
  'Funktioniert `Object.freeze` hier eigentlich rekursiv? Spoiler: nein, nur shallow.',
  'Bei `WeakMap` ist die Garbage-Collection das eigentliche Verkaufsargument.',
  'Wieso wird `this` in Arrow-Functions nicht gebunden? Weil es lexikalisch aus dem Umgebungskontext geerbt wird.',
  "`typeof null === 'object'` ist tatsächlich ein Bug aus 1995, der aus Kompatibilitätsgründen geblieben ist.",
  'Hier ein Minimalbeispiel:\n\n```ts\ntype X = readonly string[];\nconst arr: X = ["a"];\n// arr.push("b"); // Fehler\n```',
  'Vergleich `let` vs `var` in der Schleife:\n\n```js\nconst items = [1, 2, 3];\nfor (let i = 0; i < items.length; i++) {\n  setTimeout(() => console.log(i), 0);\n}\n// 0, 1, 2 — mit var wären es 3, 3, 3\n```',
  'Beispiel zur Verdeutlichung:\n\n```ts\ninterface User { name: string; age: number }\nconst u: User = { name: "Lena", age: 28 };\n```',
  'Edge-Case: `Object.create(null)` erzeugt ein Objekt ohne Prototyp — also keine `hasOwnProperty`-Methode etc.',
  'In Node.js gilt die Phase-Reihenfolge: timers → I/O callbacks → idle/prepare → poll → check → close callbacks. Microtasks dazwischen.',
  'Worker-Threads teilen den Memory nicht über Closures — nur über `MessagePort` oder `SharedArrayBuffer`.',
  'Beispiel mit async/await:\n\n```ts\nasync function fetchUser(id: string) {\n  const res = await fetch(`/api/users/${id}`);\n  if (!res.ok) throw new Error("failed");\n  return res.json();\n}\n```',
  'Die Spec-Definition findet sich übrigens in ECMA-262, Section 8.',
  'Stimmt — aber `Promise.race` löst das ganz elegant, falls man Timeout-Logik braucht.',
  'Würde hier auf `unknown` statt `any` umstellen, dann fängt der Typecheck es.',
  'Habe das vor Jahren in einer Produktiv-Code-Base erlebt — der Fix war ein Refactor zu `Map<string, T>`.',
  'Kurze Frage: greift das auch innerhalb von `Symbol.iterator`-Implementierungen?',
  'Kleines Gotcha: `JSON.stringify` ignoriert `undefined`-Properties stillschweigend.',
  'Würde ein Generator-Beispiel hier helfen?\n\n```ts\nfunction* range(n: number) {\n  for (let i = 0; i < n; i++) yield i;\n}\n```',
  'Nochmal zur Klarstellung: das gilt nur in einem Module-Context, nicht im Script-Context.',
  'Falls jemand vergleichen will — `Array.from` ist semantisch sauberer als der Spread auf einem iterierbaren Wert.',
];

const POST_TARGETS: Array<{ contentId: string; total: number; offset: number }> =
  [
    { contentId: 'typescript-junior-closures', total: 50, offset: 0 },
    { contentId: 'javascript-junior-hoisting', total: 30, offset: 7 },
    { contentId: 'typescript-senior-variance', total: 20, offset: 13 },
  ];

function generateForPost(
  contentId: string,
  count: number,
  offset: number,
): CommentSeed[] {
  const result: CommentSeed[] = [];
  if (count <= 0) return result;
  // Spread over the past 14 days, leaving the very-recent slot to the
  // anchor comments. Add a per-row minute offset so timestamps are
  // strictly distinct.
  const SPAN_MIN = 14 * 24 * 60;
  for (let i = 0; i < count; i++) {
    const author = SEED_AUTHORS[i % SEED_AUTHORS.length]!;
    const template = TEMPLATES[(i + offset) % TEMPLATES.length]!;
    const fraction = count === 1 ? 0 : i / (count - 1);
    const minutesAgo = Math.round(SPAN_MIN - fraction * SPAN_MIN) + (i % 17);
    const isEdited = i > 0 && i % 7 === 0;
    const isDeleted = i > 0 && i % 13 === 0;
    result.push({
      contentId,
      authorLogin: author.githubLogin,
      bodyMd: template,
      minutesAgo,
      editedMinutesLater: isEdited ? 60 + ((i * 17) % 480) : undefined,
      softDeleted: isDeleted || undefined,
    });
  }
  return result;
}

function buildSeed(): CommentSeed[] {
  const anchorCountsByPost = new Map<string, number>();
  for (const a of ANCHORS) {
    anchorCountsByPost.set(
      a.contentId,
      (anchorCountsByPost.get(a.contentId) ?? 0) + 1,
    );
  }
  const generated: CommentSeed[] = [];
  for (const target of POST_TARGETS) {
    const anchorCount = anchorCountsByPost.get(target.contentId) ?? 0;
    const need = Math.max(0, target.total - anchorCount);
    generated.push(...generateForPost(target.contentId, need, target.offset));
  }
  return [...ANCHORS, ...generated];
}

export type SeedCommentsResult = {
  authorsUpserted: number;
  commentsInserted: number;
  perPost: Record<string, number>;
};

export async function seedComments(): Promise<SeedCommentsResult> {
  const authorIds = new Map<string, string>();

  for (const author of SEED_AUTHORS) {
    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.githubLogin, author.githubLogin))
      .limit(1);

    let id: string;
    if (existing[0]) {
      await db
        .update(users)
        .set({
          displayName: author.displayName,
          avatarUrl: author.avatarUrl,
          role: author.role,
          githubId: author.githubId,
        })
        .where(eq(users.id, existing[0].id));
      id = existing[0].id;
    } else {
      const inserted = await db
        .insert(users)
        .values({
          githubLogin: author.githubLogin,
          displayName: author.displayName,
          avatarUrl: author.avatarUrl,
          role: author.role,
          githubId: author.githubId,
        })
        .returning({ id: users.id });
      id = inserted[0]!.id;
    }
    authorIds.set(author.githubLogin, id);
  }

  // Wipe previously-seeded comments so the script is idempotent.
  await db
    .delete(comments)
    .where(inArray(comments.userId, Array.from(authorIds.values())));

  const seed = buildSeed();
  const perPost: Record<string, number> = {};
  let commentsInserted = 0;

  for (const s of seed) {
    const postRow = await db
      .select({ id: posts.id })
      .from(posts)
      .where(eq(posts.contentId, s.contentId))
      .limit(1);
    if (!postRow[0]) {
      logger.warn(
        { contentId: s.contentId },
        'skipping comment seed — post not found, run db:seed first',
      );
      continue;
    }

    const authorId = authorIds.get(s.authorLogin);
    if (!authorId) {
      throw new Error(`Unknown seed author "${s.authorLogin}"`);
    }

    const createdAt = new Date(Date.now() - s.minutesAgo * 60 * 1000);
    const updatedAt = s.editedMinutesLater
      ? new Date(createdAt.getTime() + s.editedMinutesLater * 60 * 1000)
      : createdAt;
    const deletedAt = s.softDeleted
      ? new Date(createdAt.getTime() + 30 * 60 * 1000)
      : null;
    const bodyHtmlSafe = renderCommentBody(s.bodyMd);

    await db.insert(comments).values({
      postId: postRow[0].id,
      userId: authorId,
      bodyMd: s.bodyMd,
      bodyHtmlSafe,
      createdAt,
      updatedAt,
      deletedAt,
    });
    commentsInserted++;
    perPost[s.contentId] = (perPost[s.contentId] ?? 0) + 1;
  }

  return {
    authorsUpserted: authorIds.size,
    commentsInserted,
    perPost,
  };
}

const isMain =
  process.argv[1] !== undefined &&
  import.meta.url === `file://${process.argv[1]}`;

if (isMain) {
  seedComments()
    .then(async (result) => {
      logger.info(result, 'comments seed complete');
      await pool.end();
    })
    .catch(async (err: unknown) => {
      logger.error({ err }, 'comments seed failed');
      await pool.end().catch(() => {});
      process.exit(1);
    });
}
