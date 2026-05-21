import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { screen } from '@testing-library/react';
import { server } from '@/test/msw-server';
import { renderWithProviders } from '@/test/render';
import { MyProfilePage } from './MyProfilePage';

const authedMe = {
  user: {
    id: 'u1',
    githubLogin: 'octocat',
    displayName: 'The Octocat',
    avatarUrl: 'https://avatars.example/octocat.png',
    role: 'user',
  },
};

const profileResponse = {
  id: 'u1',
  githubLogin: 'octocat',
  displayName: 'The Octocat',
  avatarUrl: 'https://avatars.example/octocat.png',
  role: 'user',
  createdAt: '2026-05-15T10:00:00.000Z',
};

describe('MyProfilePage', () => {
  it('zeigt einen Login-Prompt, wenn der User nicht eingeloggt ist', async () => {
    server.use(
      http.get('http://localhost:3000/auth/me', () =>
        HttpResponse.json({ user: null }),
      ),
    );

    renderWithProviders(<MyProfilePage />);

    expect(
      await screen.findByRole('link', { name: /Mit GitHub anmelden/ }),
    ).toBeInTheDocument();
  });

  it('zeigt Profil-Daten, wenn der User eingeloggt ist', async () => {
    server.use(
      http.get('http://localhost:3000/auth/me', () =>
        HttpResponse.json(authedMe),
      ),
      http.get('http://localhost:3000/me/profile', () =>
        HttpResponse.json(profileResponse),
      ),
    );

    renderWithProviders(<MyProfilePage />);

    expect(await screen.findByText('The Octocat')).toBeInTheDocument();
    expect(screen.getByText('octocat')).toBeInTheDocument();
    expect(screen.getByText(/Mitglied seit Mai 2026/i)).toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: /The Octocat/i }),
    ).toBeInTheDocument();
  });
});
