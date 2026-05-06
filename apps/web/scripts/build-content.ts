import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';
import { z } from 'zod';
import { Marked } from 'marked';
import { createHighlighter, type Highlighter } from 'shiki';
import MiniSearch from 'minisearch';
import { LANGUAGES } from '../../../content/languages.config.js';

const TAG_RE = /^[a-z0-9-]+$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export interface BuildOptions {
  contentDir: string;
  outDir: string;
  languages: ReadonlyArray<{ id: string; displayName: string; shikiLang: string }>;
}

export interface BuildResult {
  totalCount: number;
  perLanguage: Record<string, number>;
  builtAt: string;
}

export const FrontmatterSchema = (
  validLanguageIds: readonly string[],
) =>
  z.object({
    id: z.string().min(1),
    slug: z.string().min(1),
    question: z.string().min(1),
    language: z.string().refine((v) => validLanguageIds.includes(v), {
      message: `language must be one of: ${validLanguageIds.join(', ')}`,
    }),
    level: z.enum(['junior', 'senior']),
    tags: z
      .array(z.string().regex(TAG_RE, 'tag must match /^[a-z0-9-]+$/'))
      .default([]),
    createdAt: z.string().regex(DATE_RE, 'createdAt must be YYYY-MM-DD'),
    updatedAt: z.string().regex(DATE_RE, 'updatedAt must be YYYY-MM-DD'),
  });

export type Frontmatter = z.infer<ReturnType<typeof FrontmatterSchema>>;

export interface PostOutput {
  frontmatter: Frontmatter;
  bodyHtml: string;
}

async function ensureEmptyDir(dir: string): Promise<void> {
  await fs.rm(dir, { recursive: true, force: true });
  await fs.mkdir(dir, { recursive: true });
}

function buildMarked(highlighter: Highlighter, shikiLangs: string[]): Marked {
  const supported = new Set(shikiLangs);
  const m = new Marked({
    gfm: true,
    breaks: false,
    async: false,
  });
  m.use({
    renderer: {
      code({ text, lang }) {
        const language = lang && supported.has(lang) ? lang : 'text';
        return highlighter.codeToHtml(text, {
          lang: language,
          themes: { light: 'github-light', dark: 'github-dark' },
          defaultColor: false,
        });
      },
    },
  });
  return m;
}

export async function buildContent(opts: BuildOptions): Promise<BuildResult> {
  const { contentDir, outDir, languages } = opts;
  const validLangIds = languages.map((l) => l.id);
  const Schema = FrontmatterSchema(validLangIds);

  const shikiLangs = Array.from(
    new Set(languages.map((l) => l.shikiLang).concat(['ts', 'js', 'tsx', 'jsx', 'text'])),
  );

  const highlighter = await createHighlighter({
    themes: ['github-light', 'github-dark'],
    langs: shikiLangs,
  });
  const md = buildMarked(highlighter, shikiLangs);

  let entries: string[];
  try {
    entries = await fs.readdir(contentDir);
  } catch {
    entries = [];
  }
  const mdFiles = entries.filter((f) => f.endsWith('.md')).sort();

  const posts: PostOutput[] = [];
  const ids = new Set<string>();

  for (const file of mdFiles) {
    const full = path.join(contentDir, file);
    const raw = await fs.readFile(full, 'utf-8');
    const parsed = matter(raw);
    const result = Schema.safeParse(parsed.data);
    if (!result.success) {
      const issues = result.error.issues
        .map((i) => `  - ${i.path.join('.') || '(root)'}: ${i.message}`)
        .join('\n');
      throw new Error(`Invalid frontmatter in ${file}:\n${issues}`);
    }
    const fm = result.data;
    if (ids.has(fm.id)) {
      throw new Error(`Duplicate id "${fm.id}" in ${file}`);
    }
    ids.add(fm.id);
    const expectedFile = `${fm.id}.md`;
    if (file !== expectedFile) {
      throw new Error(
        `Filename "${file}" does not match id "${fm.id}" (expected ${expectedFile})`,
      );
    }
    const bodyHtml = await md.parse(parsed.content);
    posts.push({ frontmatter: fm, bodyHtml });
  }

  highlighter.dispose();

  await ensureEmptyDir(outDir);
  await fs.mkdir(path.join(outDir, 'indexes'), { recursive: true });
  await fs.mkdir(path.join(outDir, 'posts'), { recursive: true });

  const perLanguage: Record<string, number> = Object.fromEntries(
    validLangIds.map((id) => [id, 0]),
  );
  const indexByLang: Record<string, Frontmatter[]> = Object.fromEntries(
    validLangIds.map((id) => [id, []]),
  );

  for (const post of posts) {
    indexByLang[post.frontmatter.language].push(post.frontmatter);
    perLanguage[post.frontmatter.language] += 1;
    await fs.writeFile(
      path.join(outDir, 'posts', `${post.frontmatter.id}.json`),
      JSON.stringify(post, null, 2),
      'utf-8',
    );
  }

  for (const lang of validLangIds) {
    await fs.writeFile(
      path.join(outDir, 'indexes', `${lang}.json`),
      JSON.stringify(indexByLang[lang], null, 2),
      'utf-8',
    );
  }

  const builtAt = new Date().toISOString();
  const manifest = {
    languages: languages.map((l) => ({
      id: l.id,
      displayName: l.displayName,
      count: perLanguage[l.id],
    })),
    totalCount: posts.length,
    builtAt,
  };
  await fs.writeFile(
    path.join(outDir, 'manifest.json'),
    JSON.stringify(manifest, null, 2),
    'utf-8',
  );

  const search = new MiniSearch<Frontmatter>({
    idField: 'id',
    fields: ['question', 'tags'],
    storeFields: ['id', 'slug', 'language', 'level', 'question'],
    extractField: (doc, field) => {
      const value = (doc as unknown as Record<string, unknown>)[field];
      if (Array.isArray(value)) return value.join(' ');
      return (value as string) ?? '';
    },
    searchOptions: {
      boost: { question: 3, tags: 1.5 },
    },
  });
  search.addAll(posts.map((p) => p.frontmatter));
  await fs.writeFile(
    path.join(outDir, 'search-index.json'),
    JSON.stringify(search.toJSON()),
    'utf-8',
  );

  return { totalCount: posts.length, perLanguage, builtAt };
}

async function main(): Promise<void> {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const repoRoot = path.resolve(here, '..', '..', '..');
  const webRoot = path.resolve(here, '..');
  const result = await buildContent({
    contentDir: path.join(repoRoot, 'content', 'interview'),
    outDir: path.join(webRoot, 'public', 'content'),
    languages: LANGUAGES,
  });
  const summary = Object.entries(result.perLanguage)
    .map(([k, v]) => `${k}=${v}`)
    .join(', ');
  console.log(
    `[build-content] ${result.totalCount} posts (${summary}) at ${result.builtAt}`,
  );
}

const isDirect =
  import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1]?.endsWith('build-content.ts');

if (isDirect) {
  main().catch((err) => {
    console.error('[build-content] FAILED');
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
