import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { server } from '@/test/msw-server';
import { renderWithProviders } from '@/test/render';
import { FavoriteButton } from './FavoriteButton';

const POST_ID = 'typescript-junior-closures';

const ANON_ME = { user: null };
const LOGGED_IN_ME = {
  user: {
    id: 'u1',
    githubLogin: 'alice',
    displayName: 'Alice',
    avatarUrl: null,
    role: 'user' as const,
  },
};

function setupAnon() {
  server.use(
    http.get('http://localhost:3000/auth/me', () => HttpResponse.json(ANON_ME)),
  );
}

function setupLoggedIn(initialFavIds: string[] = []) {
  let favIds = [...initialFavIds];
  server.use(
    http.get('http://localhost:3000/auth/me', () =>
      HttpResponse.json(LOGGED_IN_ME),
    ),
    http.get('http://localhost:3000/me/favorites/ids', () =>
      HttpResponse.json({ ids: favIds }),
    ),
    http.post('http://localhost:3000/favorites/:postId', ({ params }) => {
      const id = params.postId as string;
      if (!favIds.includes(id)) favIds.push(id);
      return HttpResponse.json({ ok: true, favorited: true });
    }),
    http.delete('http://localhost:3000/favorites/:postId', ({ params }) => {
      const id = params.postId as string;
      favIds = favIds.filter((x) => x !== id);
      return HttpResponse.json({ ok: true, favorited: false });
    }),
  );
}

describe('FavoriteButton — anonymous', () => {
  it('renders unfavorited state for anon users', async () => {
    setupAnon();
    renderWithProviders(<FavoriteButton postId={POST_ID} />);
    const btn = await screen.findByRole('button', {
      name: /Zu Favoriten hinzufügen/i,
    });
    expect(btn).toHaveAttribute('aria-pressed', 'false');
  });

  it('shows login-prompt snackbar on click', async () => {
    setupAnon();
    renderWithProviders(<FavoriteButton postId={POST_ID} />);
    const btn = await screen.findByRole('button', {
      name: /Zu Favoriten hinzufügen/i,
    });
    fireEvent.click(btn);
    await waitFor(() => {
      expect(
        screen.getByText(/Melde dich an, um Beiträge zu favorisieren/i),
      ).toBeInTheDocument();
    });
    const loginLink = screen.getByRole('link', { name: /Mit GitHub anmelden/i });
    expect(loginLink).toHaveAttribute('href', expect.stringContaining('/auth/github'));
  });
});

describe('FavoriteButton — logged in', () => {
  it('renders favorited state when postId is in favorite ids', async () => {
    setupLoggedIn([POST_ID]);
    renderWithProviders(<FavoriteButton postId={POST_ID} />);
    const btn = await screen.findByRole('button', {
      name: /Aus Favoriten entfernen/i,
    });
    expect(btn).toHaveAttribute('aria-pressed', 'true');
  });

  it('toggles to favorited on click when not yet favorited', async () => {
    setupLoggedIn([]);
    renderWithProviders(<FavoriteButton postId={POST_ID} />);
    const btn = await screen.findByRole('button', {
      name: /Zu Favoriten hinzufügen/i,
    });
    expect(btn).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(btn);
    await waitFor(() => {
      const updated = screen.getByRole('button', {
        name: /Aus Favoriten entfernen/i,
      });
      expect(updated).toHaveAttribute('aria-pressed', 'true');
    });
  });

  it('toggles to unfavorited on click when already favorited', async () => {
    setupLoggedIn([POST_ID]);
    renderWithProviders(<FavoriteButton postId={POST_ID} />);
    const btn = await screen.findByRole('button', {
      name: /Aus Favoriten entfernen/i,
    });
    fireEvent.click(btn);
    await waitFor(() => {
      const updated = screen.getByRole('button', {
        name: /Zu Favoriten hinzufügen/i,
      });
      expect(updated).toHaveAttribute('aria-pressed', 'false');
    });
  });
});
