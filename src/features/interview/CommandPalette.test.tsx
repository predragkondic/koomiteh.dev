import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { Route, Routes } from 'react-router-dom';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import MiniSearch from 'minisearch';
import { server } from '@/test/msw-server';
import { renderWithProviders } from '@/test/render';
import type { Manifest, PostFrontmatter } from '@/types';
import { CommandPalette } from './CommandPalette';

const POSTS: PostFrontmatter[] = [
  {
    id: 'ts-closure',
    slug: 'what-is-a-closure',
    question: 'What is a closure?',
    language: 'typescript',
    level: 'junior',
    tags: ['scope'],
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
  {
    id: 'js-hoisting',
    slug: 'what-is-hoisting',
    question: 'What is hoisting in JavaScript?',
    language: 'javascript',
    level: 'junior',
    tags: ['hoisting'],
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
  {
    id: 'ts-tag',
    slug: 'generics-overview',
    question: 'Generics overview',
    language: 'typescript',
    level: 'senior',
    tags: ['closure'],
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
];

function buildSearchJson() {
  const ms = new MiniSearch<PostFrontmatter>({
    idField: 'id',
    fields: ['question', 'tags'],
    storeFields: ['id', 'slug', 'language', 'level', 'question'],
    extractField: (doc, field) => {
      const v = (doc as unknown as Record<string, unknown>)[field];
      if (Array.isArray(v)) return v.join(' ');
      return (v as string) ?? '';
    },
  });
  ms.addAll(POSTS);
  return ms.toJSON();
}

function setupHandlers(manifest: Manifest, withSearchError = false) {
  server.use(
    http.get('/content/manifest.json', () => HttpResponse.json(manifest)),
    http.get('/content/search-index.json', () =>
      withSearchError
        ? HttpResponse.json({ message: 'boom' }, { status: 500 })
        : HttpResponse.json(buildSearchJson()),
    ),
  );
}

const MULTI_LANG: Manifest = {
  languages: [
    { id: 'typescript', displayName: 'TypeScript', count: 2 },
    { id: 'javascript', displayName: 'JavaScript', count: 1 },
  ],
  totalCount: 3,
  builtAt: '2026-04-30T00:00:00.000Z',
};

const SINGLE_LANG: Manifest = {
  languages: [{ id: 'typescript', displayName: 'TypeScript', count: 2 }],
  totalCount: 2,
  builtAt: '2026-04-30T00:00:00.000Z',
};

function Harness({ open }: { open: boolean }) {
  return (
    <Routes>
      <Route
        path="/"
        element={<CommandPalette open={open} onClose={() => undefined} />}
      />
      <Route
        path="/interview/:language/:slug"
        element={<div data-testid="detail">detail</div>}
      />
    </Routes>
  );
}

async function typeQuery(value: string) {
  const input = (await screen.findByLabelText(
    'Globale Suche',
  )) as HTMLInputElement;
  fireEvent.change(input, { target: { value } });
  return input;
}

describe('CommandPalette', () => {
  it('produces hits across languages and shows language badge when manifest has ≥2 languages', async () => {
    setupHandlers(MULTI_LANG);

    renderWithProviders(<Harness open />);
    await typeQuery('closure');

    await waitFor(() =>
      expect(screen.getByText('What is a closure?')).toBeInTheDocument(),
    );
    expect(screen.getAllByText('typescript').length).toBeGreaterThan(0);
  });

  it('hides language badge when manifest has exactly one language', async () => {
    setupHandlers(SINGLE_LANG);

    renderWithProviders(<Harness open />);
    await typeQuery('closure');

    await waitFor(() =>
      expect(screen.getByText('What is a closure?')).toBeInTheDocument(),
    );
    expect(screen.queryByText('typescript')).toBeNull();
  });

  it('navigates to detail page when a hit is clicked', async () => {
    setupHandlers(MULTI_LANG);

    renderWithProviders(<Harness open />);
    await typeQuery('closure');

    const item = await screen.findByText('What is a closure?');
    fireEvent.click(item);

    expect(await screen.findByTestId('detail')).toBeInTheDocument();
  });

  it('Up/Down arrows move highlight and Enter activates the highlighted hit', async () => {
    setupHandlers(MULTI_LANG);

    renderWithProviders(<Harness open />);
    const input = await typeQuery('closure');

    await waitFor(() =>
      expect(screen.getByText('What is a closure?')).toBeInTheDocument(),
    );

    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(await screen.findByTestId('detail')).toBeInTheDocument();
  });

  it('shows error message when search index fails to load', async () => {
    setupHandlers(MULTI_LANG, true);

    renderWithProviders(<Harness open />);

    expect(
      await screen.findByText(/Suchindex konnte nicht geladen werden\./),
    ).toBeInTheDocument();
  });
});
