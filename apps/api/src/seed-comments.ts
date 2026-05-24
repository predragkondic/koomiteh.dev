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
  daysAgo: number;
  editedMinutesLater?: number;
  softDeleted?: boolean;
};

const COMMENTS: CommentSeed[] = [
  // typescript-junior-closures
  {
    contentId: 'typescript-junior-closures',
    authorLogin: 'seed-lena',
    bodyMd:
      'Gute Zusammenfassung. Eine Ergänzung: `queueMicrotask` hat weniger Overhead als `Promise.resolve().then` — kein neues Promise-Objekt, keine Reaktion auf rejection. Direkter Tipp wenn die Promise-Semantik nicht gebraucht wird.',
    daysAgo: 3,
  },
  {
    contentId: 'typescript-junior-closures',
    authorLogin: 'seed-peko',
    bodyMd:
      'Nützlich um die Reihenfolge zu visualisieren:\n\n```ts\nconsole.log(\'sync\');\nPromise.resolve().then(() => console.log(\'micro\'));\nsetTimeout(() => console.log(\'macro\'));\n// sync, micro, macro\n```',
    daysAgo: 2,
    editedMinutesLater: 90,
  },
  {
    contentId: 'typescript-junior-closures',
    authorLogin: 'seed-sara',
    bodyMd: 'Wird hier nichts mehr stehen.',
    daysAgo: 1,
    softDeleted: true,
  },
  {
    contentId: 'typescript-junior-closures',
    authorLogin: 'seed-peko',
    bodyMd: 'Kleine Korrektur: `setImmediate` ist Node-only, nicht im Browser.',
    daysAgo: 0,
  },
  {
    contentId: 'typescript-junior-closures',
    authorLogin: 'seed-marek',
    bodyMd:
      'Genau das ist die Stelle die Leute im Interview oft falsch sagen. Der microtask-queue wird zwischen macrotasks vollständig entleert.',
    daysAgo: 0,
  },

  // javascript-junior-hoisting
  {
    contentId: 'javascript-junior-hoisting',
    authorLogin: 'seed-sara',
    bodyMd:
      'Hoisting für `let` und `const` ist tricky — sie *werden* gehoist, aber landen in der Temporal Dead Zone bis zur Deklaration. Das `*werden*` bleibt hier übrigens als Plain-Text stehen, weil Comments kein Markdown mehr rendern.',
    daysAgo: 4,
  },
  {
    contentId: 'javascript-junior-hoisting',
    authorLogin: 'seed-tom',
    bodyMd:
      'Hier ein Minimalbeispiel:\n\n```js\nconsole.log(x); // ReferenceError (TDZ)\nlet x = 1;\n```\n\nUnd zum Vergleich `var`:\n\n```js\nconsole.log(y); // undefined (hoisted + initialisiert)\nvar y = 1;\n```',
    daysAgo: 2,
  },

  // typescript-senior-variance
  {
    contentId: 'typescript-senior-variance',
    authorLogin: 'seed-peko',
    bodyMd:
      'Co/Contra-Varianz wird in der Literatur oft mit `+T` / `-T` notiert. TypeScript hat das seit 4.7 als explizite Annotations: `out T` (covariant), `in T` (contravariant), `in out T` (invariant).',
    daysAgo: 6,
    editedMinutesLater: 600,
  },
  {
    contentId: 'typescript-senior-variance',
    authorLogin: 'seed-lena',
    bodyMd:
      'Bivariance bei Function-Parametern (`strictFunctionTypes: false`) ist der häufigste Fußnagelfall. Mit `strictFunctionTypes: true` (default in `strict`) verschwindet das Problem.',
    daysAgo: 1,
  },
];

export type SeedCommentsResult = {
  authorsUpserted: number;
  commentsInserted: number;
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

  let commentsInserted = 0;
  for (const seed of COMMENTS) {
    const postRow = await db
      .select({ id: posts.id })
      .from(posts)
      .where(eq(posts.contentId, seed.contentId))
      .limit(1);
    if (!postRow[0]) {
      logger.warn(
        { contentId: seed.contentId },
        'skipping comment seed — post not found, run db:seed first',
      );
      continue;
    }

    const authorId = authorIds.get(seed.authorLogin);
    if (!authorId) {
      throw new Error(`Unknown seed author "${seed.authorLogin}"`);
    }

    const createdAt = new Date(Date.now() - seed.daysAgo * 24 * 60 * 60 * 1000);
    const updatedAt = seed.editedMinutesLater
      ? new Date(createdAt.getTime() + seed.editedMinutesLater * 60 * 1000)
      : createdAt;
    const deletedAt = seed.softDeleted
      ? new Date(createdAt.getTime() + 30 * 60 * 1000)
      : null;
    const bodyHtmlSafe = renderCommentBody(seed.bodyMd);

    await db.insert(comments).values({
      postId: postRow[0].id,
      userId: authorId,
      bodyMd: seed.bodyMd,
      bodyHtmlSafe,
      createdAt,
      updatedAt,
      deletedAt,
    });
    commentsInserted++;
  }

  return {
    authorsUpserted: authorIds.size,
    commentsInserted,
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

