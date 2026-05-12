import { describe, it, expect } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { Routes, Route } from 'react-router-dom';
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

function setupAdmin() {
  server.use(
    http.get('http://localhost:3000/auth/me', () =>
      HttpResponse.json(ADMIN_ME),
    ),
  );
}

describe('AdminPostEditorPage — preview', () => {
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

  it('updates preview reactively when textarea changes', async () => {
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
    fireEvent.change(textarea, { target: { value: '## First' } });
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: /First/ })).toBeInTheDocument(),
    );

    fireEvent.change(textarea, { target: { value: '## Second' } });
    await waitFor(() => {
      expect(
        screen.queryByRole('heading', { name: /First/ }),
      ).not.toBeInTheDocument();
      expect(
        screen.getByRole('heading', { name: /Second/ }),
      ).toBeInTheDocument();
    });
  });
});
