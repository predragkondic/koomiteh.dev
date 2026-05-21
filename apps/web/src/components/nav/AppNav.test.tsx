import type { ReactElement } from 'react';
import { describe, it, expect } from 'vitest';
import { http, HttpResponse, type JsonBodyType } from 'msw';
import { screen } from '@testing-library/react';
import { Routes, Route } from 'react-router-dom';
import { server } from '@/test/msw-server';
import { renderWithProviders } from '@/test/render';
import { AppThemeProvider } from '@/theme/ThemeContext';
import { AppSidebar } from './AppSidebar';
import { AppBottomNav } from './AppBottomNav';
import {
  buildAdminNavItems,
  buildFrontendNavItems,
} from './appNavConfig';

function mockMe(body: JsonBodyType) {
  server.use(
    http.get('http://localhost:3000/auth/me', () => HttpResponse.json(body)),
  );
}

const USER_ME = {
  user: {
    id: 'u1',
    githubLogin: 'alice',
    displayName: 'Alice',
    avatarUrl: null,
    role: 'user' as const,
  },
};
const ADMIN_ME = {
  user: {
    id: 'u2',
    githubLogin: 'root',
    displayName: 'Root',
    avatarUrl: null,
    role: 'admin' as const,
  },
};

function renderNav(
  ui: ReactElement,
  initialEntries: string[] = ['/interview'],
) {
  return renderWithProviders(
    <AppThemeProvider>
      <Routes>
        <Route path="*" element={ui} />
      </Routes>
    </AppThemeProvider>,
    { initialEntries },
  );
}

describe('AppSidebar', () => {
  it('renders frontend nav for signed-in user with profile children', async () => {
    mockMe(USER_ME);
    renderNav(
      <AppSidebar items={buildFrontendNavItems(USER_ME.user)} />,
      ['/me/favorites'],
    );

    expect(await screen.findByRole('link', { name: /Beiträge/i })).toHaveAttribute(
      'href',
      '/interview',
    );
    expect(screen.getByRole('link', { name: /^Profil$/i })).toHaveAttribute(
      'href',
      '/me',
    );
    expect(screen.getByRole('link', { name: /Favoriten/i })).toHaveAttribute(
      'href',
      '/me/favorites',
    );
    expect(screen.getByRole('button', { name: /Abmelden/i })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /^Admin$/i })).toBeNull();
  });

  it('renders Admin link for staff on frontend', async () => {
    mockMe(ADMIN_ME);
    renderNav(
      <AppSidebar items={buildFrontendNavItems(ADMIN_ME.user)} />,
      ['/interview'],
    );

    expect(await screen.findByRole('link', { name: /^Admin$/i })).toHaveAttribute(
      'href',
      '/admin',
    );
  });

  it('renders admin-mode items', async () => {
    mockMe(ADMIN_ME);
    renderNav(<AppSidebar items={buildAdminNavItems()} />, ['/admin']);

    expect(
      screen.getByRole('link', { name: /Zurück zum Frontend/i }),
    ).toHaveAttribute('href', '/interview');
    expect(await screen.findByRole('link', { name: /Beiträge/i })).toHaveAttribute(
      'href',
      '/admin',
    );
    expect(screen.getByRole('link', { name: /^User$/i })).toHaveAttribute(
      'href',
      '/admin/users',
    );
  });
});

describe('AppBottomNav', () => {
  it('renders flat frontend items without submenu links', async () => {
    mockMe(USER_ME);
    renderNav(
      <AppBottomNav items={buildFrontendNavItems(USER_ME.user)} />,
      ['/interview'],
    );

    expect(await screen.findByRole('link', { name: /Beiträge/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^Profil$/i })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Einstellungen/i })).toBeNull();
    expect(screen.getByRole('button', { name: /Abmelden/i })).toBeInTheDocument();
  });
});
