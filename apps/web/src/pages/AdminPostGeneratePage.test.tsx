import { describe, it, expect } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { Routes, Route } from 'react-router-dom';
import type { AdminPostCreate } from '@koomiteh/shared';
import { server } from '@/test/msw-server';
import { renderWithProviders } from '@/test/render';
import { AdminPostGeneratePage } from './AdminPostGeneratePage';

const ADMIN_ME = {
  user: {
    id: 'u1',
    githubLogin: 'admin',
    displayName: 'Admin',
    avatarUrl: null,
    role: 'admin' as const,
  },
};

function setupAdmin() {
  server.use(
    http.get('http://localhost:3000/auth/me', () =>
      HttpResponse.json(ADMIN_ME),
    ),
  );
}

describe('AdminPostGeneratePage', () => {
  it('shows input form initially (topic, language, level, generate button)', () => {
    setupAdmin();
    renderWithProviders(
      <Routes>
        <Route
          path="/admin/posts/generate"
          element={<AdminPostGeneratePage />}
        />
      </Routes>,
      { initialEntries: ['/admin/posts/generate'] },
    );

    expect(screen.getByLabelText(/Thema/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Sprache/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Level/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Generieren/i }),
    ).toBeInTheDocument();
  });

  it('renders the generated draft as editable form fields populated with initial values', async () => {
    setupAdmin();
    server.use(
      http.post('http://localhost:3000/admin/posts/generate', async () => {
        return HttpResponse.json({
          question: 'What is a closure?',
          slug: 'what-is-a-closure',
          tags: ['closures', 'functions'],
          bodyMd: '## Closure\n\nA closure is a function with its scope.',
          language: 'typescript',
          level: 'junior',
        });
      }),
    );

    renderWithProviders(
      <Routes>
        <Route
          path="/admin/posts/generate"
          element={<AdminPostGeneratePage />}
        />
      </Routes>,
      { initialEntries: ['/admin/posts/generate'] },
    );

    const topic = screen.getByLabelText(/Thema/i);
    fireEvent.change(topic, { target: { value: 'closures' } });
    fireEvent.click(screen.getByRole('button', { name: /Generieren/i }));

    const questionField = (await screen.findByLabelText(/^Frage/i)) as HTMLInputElement;
    expect(questionField.value).toBe('What is a closure?');

    const slugField = screen.getByLabelText(/^Slug/i) as HTMLInputElement;
    expect(slugField.value).toBe('what-is-a-closure');

    const tagsField = screen.getByLabelText(/^Tags/i) as HTMLInputElement;
    expect(tagsField.value).toBe('closures, functions');

    const bodyField = screen.getByLabelText(/Inhalt \(Markdown\)/i) as HTMLTextAreaElement;
    expect(bodyField.value).toContain('## Closure');
  });

  it('renders live markdown preview that updates as bodyMd is edited', async () => {
    setupAdmin();
    server.use(
      http.post('http://localhost:3000/admin/posts/generate', async () =>
        HttpResponse.json({
          question: 'Q',
          slug: 'q',
          tags: ['t'],
          bodyMd: '# Initial',
          language: 'typescript',
          level: 'junior',
        }),
      ),
    );

    renderWithProviders(
      <Routes>
        <Route
          path="/admin/posts/generate"
          element={<AdminPostGeneratePage />}
        />
      </Routes>,
      { initialEntries: ['/admin/posts/generate'] },
    );

    fireEvent.change(screen.getByLabelText(/Thema/i), {
      target: { value: 'closures' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Generieren/i }));

    await screen.findByRole('heading', { name: /Initial/ });

    const bodyField = screen.getByLabelText(/Inhalt \(Markdown\)/i);
    fireEvent.change(bodyField, { target: { value: '## Updated heading' } });

    await waitFor(() => {
      expect(
        screen.queryByRole('heading', { name: /Initial/ }),
      ).not.toBeInTheDocument();
      const h2 = screen.getByRole('heading', { name: /Updated heading/ });
      expect(h2.tagName.toLowerCase()).toBe('h2');
    });
  });

  it('saves edited draft via POST /admin/posts and navigates to edit page', async () => {
    setupAdmin();
    server.use(
      http.post('http://localhost:3000/admin/posts/generate', async () =>
        HttpResponse.json({
          question: 'Q',
          slug: 'q',
          tags: ['t'],
          bodyMd: '# Body',
          language: 'typescript',
          level: 'junior',
        }),
      ),
    );

    let receivedBody: AdminPostCreate | null = null;
    server.use(
      http.post('http://localhost:3000/admin/posts', async ({ request }) => {
        receivedBody = (await request.json()) as AdminPostCreate;
        return HttpResponse.json({
          frontmatter: {
            id: 'typescript/q/junior',
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
          path="/admin/posts/generate"
          element={<AdminPostGeneratePage />}
        />
        <Route
          path="/admin/posts/:id/edit"
          element={<div data-testid="edit-page">EDIT</div>}
        />
      </Routes>,
      { initialEntries: ['/admin/posts/generate'] },
    );

    fireEvent.change(screen.getByLabelText(/Thema/i), {
      target: { value: 'closures' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Generieren/i }));

    const slugField = (await screen.findByLabelText(/^Slug/i)) as HTMLInputElement;
    fireEvent.change(slugField, { target: { value: 'edited-slug' } });

    fireEvent.click(screen.getByRole('button', { name: /^Speichern$/i }));

    await waitFor(() => {
      expect(screen.getByTestId('edit-page')).toBeInTheDocument();
    });
    expect(receivedBody).toMatchObject({
      slug: 'edited-slug',
      question: 'Q',
      tags: ['t'],
      bodyMd: '# Body',
      language: 'typescript',
      level: 'junior',
    });
  });

  it('shows slug-conflict error and stays on page when create returns 409', async () => {
    setupAdmin();
    server.use(
      http.post('http://localhost:3000/admin/posts/generate', async () =>
        HttpResponse.json({
          question: 'Q',
          slug: 'taken',
          tags: ['t'],
          bodyMd: '# Body',
          language: 'typescript',
          level: 'junior',
        }),
      ),
      http.post('http://localhost:3000/admin/posts', () =>
        HttpResponse.json({ error: 'slug_conflict' }, { status: 409 }),
      ),
    );

    renderWithProviders(
      <Routes>
        <Route
          path="/admin/posts/generate"
          element={<AdminPostGeneratePage />}
        />
        <Route
          path="/admin/posts/:id/edit"
          element={<div data-testid="edit-page">EDIT</div>}
        />
      </Routes>,
      { initialEntries: ['/admin/posts/generate'] },
    );

    fireEvent.change(screen.getByLabelText(/Thema/i), {
      target: { value: 'closures' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Generieren/i }));

    await screen.findByLabelText(/^Slug/i);
    fireEvent.click(screen.getByRole('button', { name: /^Speichern$/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/Slug/i);
    });
    expect(screen.queryByTestId('edit-page')).not.toBeInTheDocument();
  });

  it('cancels back to /admin when cancel button is clicked', async () => {
    setupAdmin();
    server.use(
      http.post('http://localhost:3000/admin/posts/generate', async () =>
        HttpResponse.json({
          question: 'Q',
          slug: 'q',
          tags: ['t'],
          bodyMd: '# Body',
          language: 'typescript',
          level: 'junior',
        }),
      ),
    );

    renderWithProviders(
      <Routes>
        <Route
          path="/admin"
          element={<div data-testid="admin-home">ADMIN</div>}
        />
        <Route
          path="/admin/posts/generate"
          element={<AdminPostGeneratePage />}
        />
      </Routes>,
      { initialEntries: ['/admin/posts/generate'] },
    );

    fireEvent.change(screen.getByLabelText(/Thema/i), {
      target: { value: 'closures' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Generieren/i }));

    await screen.findByLabelText(/^Slug/i);
    fireEvent.click(screen.getByRole('button', { name: /^Abbrechen$/i }));

    await waitFor(() => {
      expect(screen.getByTestId('admin-home')).toBeInTheDocument();
    });
  });

  it('regenerates with same inputs when no edits have been made', async () => {
    setupAdmin();
    let callCount = 0;
    const receivedBodies: unknown[] = [];
    server.use(
      http.post(
        'http://localhost:3000/admin/posts/generate',
        async ({ request }) => {
          callCount += 1;
          receivedBodies.push(await request.json());
          return HttpResponse.json({
            question: callCount === 1 ? 'First question' : 'Second question',
            slug: callCount === 1 ? 'first' : 'second',
            tags: ['t'],
            bodyMd: callCount === 1 ? '# First' : '# Second',
            language: 'typescript',
            level: 'junior',
          });
        },
      ),
    );

    renderWithProviders(
      <Routes>
        <Route
          path="/admin/posts/generate"
          element={<AdminPostGeneratePage />}
        />
      </Routes>,
      { initialEntries: ['/admin/posts/generate'] },
    );

    fireEvent.change(screen.getByLabelText(/Thema/i), {
      target: { value: 'closures' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^Generieren$/i }));

    const questionField = (await screen.findByLabelText(
      /^Frage/i,
    )) as HTMLInputElement;
    expect(questionField.value).toBe('First question');

    fireEvent.click(
      screen.getByRole('button', { name: /Neu generieren|Regenerate/i }),
    );

    await waitFor(() => {
      const f = screen.getByLabelText(/^Frage/i) as HTMLInputElement;
      expect(f.value).toBe('Second question');
    });

    expect(callCount).toBe(2);
    expect(receivedBodies[1]).toMatchObject({
      topic: 'closures',
      language: 'typescript',
      level: 'junior',
    });
  });

  it('shows confirm dialog when regenerating after edits, then regenerates on confirm', async () => {
    setupAdmin();
    let callCount = 0;
    server.use(
      http.post('http://localhost:3000/admin/posts/generate', async () => {
        callCount += 1;
        return HttpResponse.json({
          question: callCount === 1 ? 'First' : 'Second',
          slug: callCount === 1 ? 'first' : 'second',
          tags: ['t'],
          bodyMd: '# Body',
          language: 'typescript',
          level: 'junior',
        });
      }),
    );

    renderWithProviders(
      <Routes>
        <Route
          path="/admin/posts/generate"
          element={<AdminPostGeneratePage />}
        />
      </Routes>,
      { initialEntries: ['/admin/posts/generate'] },
    );

    fireEvent.change(screen.getByLabelText(/Thema/i), {
      target: { value: 'closures' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^Generieren$/i }));

    const questionField = (await screen.findByLabelText(
      /^Frage/i,
    )) as HTMLInputElement;
    fireEvent.change(questionField, { target: { value: 'Edited question' } });

    fireEvent.click(
      screen.getByRole('button', { name: /Neu generieren|Regenerate/i }),
    );

    const dialog = await screen.findByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(callCount).toBe(1);

    const confirmBtn = screen.getByRole('button', {
      name: /Verwerfen|Discard|Bestätigen/i,
    });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      const f = screen.getByLabelText(/^Frage/i) as HTMLInputElement;
      expect(f.value).toBe('Second');
    });
    expect(callCount).toBe(2);
  });

  it('keeps edits when regenerate confirm dialog is cancelled', async () => {
    setupAdmin();
    let callCount = 0;
    server.use(
      http.post('http://localhost:3000/admin/posts/generate', async () => {
        callCount += 1;
        return HttpResponse.json({
          question: 'First',
          slug: 'first',
          tags: ['t'],
          bodyMd: '# Body',
          language: 'typescript',
          level: 'junior',
        });
      }),
    );

    renderWithProviders(
      <Routes>
        <Route
          path="/admin/posts/generate"
          element={<AdminPostGeneratePage />}
        />
      </Routes>,
      { initialEntries: ['/admin/posts/generate'] },
    );

    fireEvent.change(screen.getByLabelText(/Thema/i), {
      target: { value: 'closures' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^Generieren$/i }));

    const questionField = (await screen.findByLabelText(
      /^Frage/i,
    )) as HTMLInputElement;
    fireEvent.change(questionField, { target: { value: 'Edited question' } });

    fireEvent.click(
      screen.getByRole('button', { name: /Neu generieren|Regenerate/i }),
    );

    await screen.findByRole('dialog');
    const cancelBtn = screen.getByRole('button', { name: /^Abbrechen$|^Cancel$/i });
    fireEvent.click(cancelBtn);

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(callCount).toBe(1);
    expect((screen.getByLabelText(/^Frage/i) as HTMLInputElement).value).toBe(
      'Edited question',
    );
  });

  it('warns via beforeunload when draft has unsaved edits', async () => {
    setupAdmin();
    server.use(
      http.post('http://localhost:3000/admin/posts/generate', async () =>
        HttpResponse.json({
          question: 'Q',
          slug: 'q',
          tags: ['t'],
          bodyMd: '# Body',
          language: 'typescript',
          level: 'junior',
        }),
      ),
    );

    renderWithProviders(
      <Routes>
        <Route
          path="/admin/posts/generate"
          element={<AdminPostGeneratePage />}
        />
      </Routes>,
      { initialEntries: ['/admin/posts/generate'] },
    );

    fireEvent.change(screen.getByLabelText(/Thema/i), {
      target: { value: 'closures' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^Generieren$/i }));

    const questionField = (await screen.findByLabelText(
      /^Frage/i,
    )) as HTMLInputElement;

    const cleanEvent = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(cleanEvent);
    expect(cleanEvent.defaultPrevented).toBe(false);

    fireEvent.change(questionField, { target: { value: 'Edited' } });

    await waitFor(() => {
      const dirtyEvent = new Event('beforeunload', { cancelable: true });
      window.dispatchEvent(dirtyEvent);
      expect(dirtyEvent.defaultPrevented).toBe(true);
    });
  });

  it('shows error alert when generation returns 503', async () => {
    setupAdmin();
    server.use(
      http.post('http://localhost:3000/admin/posts/generate', () =>
        HttpResponse.json({ error: 'generate_unavailable' }, { status: 503 }),
      ),
    );

    renderWithProviders(
      <Routes>
        <Route
          path="/admin/posts/generate"
          element={<AdminPostGeneratePage />}
        />
      </Routes>,
      { initialEntries: ['/admin/posts/generate'] },
    );

    fireEvent.change(screen.getByLabelText(/Thema/i), {
      target: { value: 'closures' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^Generieren$/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });

  it('retry button in error alert re-runs generate with same inputs', async () => {
    setupAdmin();
    const seen: unknown[] = [];
    let call = 0;
    server.use(
      http.post(
        'http://localhost:3000/admin/posts/generate',
        async ({ request }) => {
          call += 1;
          seen.push(await request.json());
          if (call === 1) {
            return HttpResponse.json(
              { error: 'gemini_failed' },
              { status: 502 },
            );
          }
          return HttpResponse.json({
            question: 'Recovered',
            slug: 'recovered',
            tags: ['t'],
            bodyMd: '# Recovered',
            language: 'typescript',
            level: 'junior',
          });
        },
      ),
    );

    renderWithProviders(
      <Routes>
        <Route
          path="/admin/posts/generate"
          element={<AdminPostGeneratePage />}
        />
      </Routes>,
      { initialEntries: ['/admin/posts/generate'] },
    );

    fireEvent.change(screen.getByLabelText(/Thema/i), {
      target: { value: 'closures' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^Generieren$/i }));

    const alert = await screen.findByRole('alert');
    const retryBtn = await screen.findByRole('button', {
      name: /Erneut versuchen|Retry/i,
    });
    expect(alert).toBeInTheDocument();

    fireEvent.click(retryBtn);

    const questionField = (await screen.findByLabelText(
      /^Frage/i,
    )) as HTMLInputElement;
    expect(questionField.value).toBe('Recovered');

    expect(call).toBe(2);
    expect(seen[1]).toMatchObject({
      topic: 'closures',
      language: 'typescript',
      level: 'junior',
    });
  });
});
