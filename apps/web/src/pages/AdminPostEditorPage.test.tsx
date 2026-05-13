import { describe, it, expect } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { Routes, Route } from 'react-router-dom';
import type { AdminPostCreate } from '@koomiteh/shared';
import { server } from '@/test/msw-server';
import { renderWithProviders } from '@/test/render';
import { AdminPostEditorPage } from './AdminPostEditorPage';

const ADMIN_ME = {
  user: {
    id: 'u1',
    githubLogin: 'admin',
    displayName: 'Admin',
    avatarUrl: null,
    role: 'admin' as const,
  },
};

const EXISTING_POST = {
  frontmatter: {
    id: 'typescript/existing-question/junior',
    slug: 'existing-question',
    question: 'Existing question',
    language: 'typescript',
    level: 'junior' as const,
    tags: ['event-loop', 'async-await'],
    updatedAt: '2026-05-12T12:00:00.000Z',
    deletedAt: null,
  },
  bodyMd: '## Existing body',
};

function setupAdmin() {
  server.use(
    http.get('http://localhost:3000/auth/me', () =>
      HttpResponse.json(ADMIN_ME),
    ),
  );
}

function setupEditPost() {
  server.use(
    http.get('http://localhost:3000/admin/posts/:id', ({ params }) => {
      expect(params.id).toBe('typescript/existing-question/junior');
      return HttpResponse.json(EXISTING_POST);
    }),
  );
}

describe('AdminPostEditorPage', () => {
  it('defaults the body card to split mode with all view toggles visible', async () => {
    setupAdmin();
    renderWithProviders(
      <Routes>
        <Route
          path="/admin/posts/new"
          element={<AdminPostEditorPage mode="new" />}
        />
      </Routes>,
      { initialEntries: ['/admin/posts/new'] },
    );

    expect(
      await screen.findByRole('button', { name: /^split$/i }),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /^editor$/i })).toBeVisible();
    expect(screen.getByRole('button', { name: /^preview$/i })).toBeVisible();
  });

  it('renders live preview reflecting textarea input', async () => {
    setupAdmin();
    renderWithProviders(
      <Routes>
        <Route
          path="/admin/posts/new"
          element={<AdminPostEditorPage mode="new" />}
        />
      </Routes>,
      { initialEntries: ['/admin/posts/new'] },
    );

    const textarea = await screen.findByLabelText(/Inhalt \(Markdown\)/i);
    fireEvent.change(textarea, {
      target: { value: '# Hello\n\nSome **bold** text.' },
    });

    await waitFor(() => {
      const heading = screen.getByRole('heading', { name: /Hello/ });
      expect(heading.tagName.toLowerCase()).toBe('h1');
      expect(screen.getByText('bold')).toBeInTheDocument();
    });
  });

  it('commits entered tags as kebab-case chips', async () => {
    setupAdmin();
    renderWithProviders(
      <Routes>
        <Route
          path="/admin/posts/new"
          element={<AdminPostEditorPage mode="new" />}
        />
      </Routes>,
      { initialEntries: ['/admin/posts/new'] },
    );

    const input = await screen.findByPlaceholderText(/add tag/i);
    fireEvent.change(input, { target: { value: 'Async Await' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    expect(await screen.findByText('async-await')).toBeInTheDocument();
  });

  it('switches between split, preview, and editor body modes', async () => {
    setupAdmin();
    renderWithProviders(
      <Routes>
        <Route
          path="/admin/posts/new"
          element={<AdminPostEditorPage mode="new" />}
        />
      </Routes>,
      { initialEntries: ['/admin/posts/new'] },
    );

    const textarea = await screen.findByLabelText(/Inhalt \(Markdown\)/i);
    fireEvent.change(textarea, { target: { value: '## Live Preview' } });

    await waitFor(() =>
      expect(
        screen.getByRole('heading', { name: /Live Preview/i }),
      ).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole('button', { name: /^preview$/i }));
    expect(
      screen.queryByLabelText(/Inhalt \(Markdown\)/i),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /Live Preview/i }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^editor$/i }));
    expect(screen.getByLabelText(/Inhalt \(Markdown\)/i)).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: /Live Preview/i }),
    ).not.toBeInTheDocument();
  });

  it('marks the form dirty after normalized tag entry and enables save', async () => {
    setupAdmin();
    renderWithProviders(
      <Routes>
        <Route
          path="/admin/posts/new"
          element={<AdminPostEditorPage mode="new" />}
        />
      </Routes>,
      { initialEntries: ['/admin/posts/new'] },
    );

    const saveButton = screen.getByRole('button', {
      name: /änderungen speichern/i,
    });
    expect(saveButton).toBeDisabled();

    const tagInput = await screen.findByPlaceholderText(/add tag/i);
    fireEvent.change(tagInput, { target: { value: 'Event Loop' } });
    fireEvent.keyDown(tagInput, { key: 'Enter', code: 'Enter' });

    expect(await screen.findByText('event-loop')).toBeInTheDocument();
    expect(saveButton).toBeEnabled();
  });

  it('autofills the slug from question until the slug is manually edited', async () => {
    setupAdmin();
    renderWithProviders(
      <Routes>
        <Route
          path="/admin/posts/new"
          element={<AdminPostEditorPage mode="new" />}
        />
      </Routes>,
      { initialEntries: ['/admin/posts/new'] },
    );

    const questionInput = await screen.findByLabelText(/^Frage$/i);
    const slugInput = screen.getByLabelText(/^Slug$/i) as HTMLInputElement;

    fireEvent.change(questionInput, {
      target: { value: 'Explain The Event Loop' },
    });
    expect(slugInput.value).toBe('explain-the-event-loop');

    fireEvent.change(slugInput, { target: { value: 'manual-slug' } });
    fireEvent.change(questionInput, { target: { value: 'Something Else' } });
    expect(slugInput.value).toBe('manual-slug');
  });

  it('loads edit mode into the redesigned metadata layout', async () => {
    setupAdmin();
    setupEditPost();
    renderWithProviders(
      <Routes>
        <Route
          path="/admin/posts/:id/edit"
          element={<AdminPostEditorPage mode="edit" />}
        />
      </Routes>,
      { initialEntries: ['/admin/posts/typescript%2Fexisting-question%2Fjunior/edit'] },
    );

    expect(await screen.findByText(/Metadaten/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Frage$/i)).toHaveValue('Existing question');
    expect(screen.getByLabelText(/^Slug$/i)).toHaveValue('existing-question');
    expect(screen.getByText('event-loop')).toBeInTheDocument();
    expect(screen.getByText(/Veröffentlicht/i)).toBeInTheDocument();
  });

  it('keeps the create flow working with normalized tags', async () => {
    setupAdmin();

    let receivedBody: AdminPostCreate | null = null;
    server.use(
      http.post('http://localhost:3000/admin/posts', async ({ request }) => {
        receivedBody = (await request.json()) as AdminPostCreate;
        return HttpResponse.json({
          frontmatter: {
            id: 'typescript/closures/junior',
            slug: receivedBody.slug,
            question: receivedBody.question,
            language: receivedBody.language,
            level: receivedBody.level,
            tags: receivedBody.tags,
            updatedAt: new Date().toISOString(),
            deletedAt: null,
          },
          bodyMd: receivedBody.bodyMd,
        });
      }),
    );

    renderWithProviders(
      <Routes>
        <Route
          path="/admin/posts/new"
          element={<AdminPostEditorPage mode="new" />}
        />
        <Route
          path="/admin/posts/:id/edit"
          element={<div data-testid="edit-page">EDIT</div>}
        />
      </Routes>,
      { initialEntries: ['/admin/posts/new'] },
    );

    fireEvent.change(await screen.findByLabelText(/^Frage$/i), {
      target: { value: 'What is a closure?' },
    });
    fireEvent.change(screen.getByLabelText(/Inhalt \(Markdown\)/i), {
      target: { value: '# Closures' },
    });

    const tagInput = screen.getByPlaceholderText(/add tag/i);
    fireEvent.change(tagInput, { target: { value: 'Event Loop' } });
    fireEvent.keyDown(tagInput, { key: 'Enter', code: 'Enter' });

    fireEvent.click(
      screen.getByRole('button', { name: /änderungen speichern/i }),
    );

    await waitFor(() =>
      expect(screen.getByTestId('edit-page')).toBeInTheDocument(),
    );
    expect(receivedBody).toMatchObject({
      slug: 'what-is-a-closure',
      question: 'What is a closure?',
      tags: ['event-loop'],
      bodyMd: '# Closures',
      language: 'typescript',
      level: 'junior',
    });
  });
});
