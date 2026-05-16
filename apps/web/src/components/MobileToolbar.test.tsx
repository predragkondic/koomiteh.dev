import type { Dispatch, SetStateAction } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { http, HttpResponse, type JsonBodyType } from 'msw';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { server } from '@/test/msw-server';
import { renderWithProviders } from '@/test/render';
import { AppThemeProvider } from '@/theme/ThemeContext';
import { MobileToolbar } from './MobileToolbar';

function renderToolbar(
  props: { setPaletteOpen?: Dispatch<SetStateAction<boolean>> } = {},
) {
  return renderWithProviders(
    <AppThemeProvider>
      <MobileToolbar setPaletteOpen={props.setPaletteOpen ?? (() => undefined)} />
    </AppThemeProvider>,
  );
}

const ANON_ME = { user: null };
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

function mockMe(body: JsonBodyType) {
  server.use(
    http.get('http://localhost:3000/auth/me', () => HttpResponse.json(body)),
  );
}

describe('MobileToolbar', () => {
  it('renders the appName logo, search icon and burger button', async () => {
    mockMe(ANON_ME);
    renderToolbar();

    expect(await screen.findByAltText('koomiteh.dev')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Suche öffnen/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Menü öffnen/i })).toBeInTheDocument();
  });

  it('opens the menu on burger click and closes it again when login is clicked', async () => {
    mockMe(ANON_ME);
    renderToolbar();

    fireEvent.click(screen.getByRole('button', { name: /Menü öffnen/i }));

    const login = await screen.findByRole('menuitem', {
      name: /Mit GitHub anmelden/i,
    });
    expect(login).toBeInTheDocument();

    fireEvent.click(login);

    await waitFor(() => {
      expect(
        screen.queryByRole('menuitem', { name: /Mit GitHub anmelden/i }),
      ).toBeNull();
    });
  });

  it('shows Favorites and Logout when signed in as user, hides Admin', async () => {
    mockMe(USER_ME);
    renderToolbar();

    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: /Menü öffnen/i }),
      ).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByRole('button', { name: /Menü öffnen/i }));

    expect(
      await screen.findByRole('menuitem', { name: /Favoriten/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /Abmelden/i })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: /Admin/i })).toBeNull();
    expect(
      screen.queryByRole('menuitem', { name: /Mit GitHub anmelden/i }),
    ).toBeNull();
  });

  it('invokes setPaletteOpen(true) when the search icon is clicked', async () => {
    mockMe(ANON_ME);
    const setPaletteOpen = vi.fn();
    renderToolbar({ setPaletteOpen });

    fireEvent.click(screen.getByRole('button', { name: /Suche öffnen/i }));

    expect(setPaletteOpen).toHaveBeenCalledWith(true);
  });

  it('shows the Admin menu item only when role is admin', async () => {
    mockMe(ADMIN_ME);
    renderToolbar();

    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: /Menü öffnen/i }),
      ).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByRole('button', { name: /Menü öffnen/i }));

    expect(
      await screen.findByRole('menuitem', { name: /Admin/i }),
    ).toBeInTheDocument();
  });
});
