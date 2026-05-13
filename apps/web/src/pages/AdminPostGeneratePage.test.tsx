import { describe, it, expect } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { Routes, Route } from 'react-router-dom';
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

  it('renders the generated draft read-only after a successful generation', async () => {
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

    await waitFor(() => {
      expect(screen.getByText(/What is a closure\?/)).toBeInTheDocument();
    });
    expect(screen.getByText('what-is-a-closure')).toBeInTheDocument();
    expect(screen.getByText('closures')).toBeInTheDocument();
    expect(screen.getByText('functions')).toBeInTheDocument();
    expect(screen.getByText(/Closure/)).toBeInTheDocument();
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
    fireEvent.click(screen.getByRole('button', { name: /Generieren/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });
});
