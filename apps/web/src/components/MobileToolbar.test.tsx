import type { Dispatch, SetStateAction } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/render';
import { AppThemeProvider } from '@/theme/ThemeContext';
import { MobileToolbar } from './MobileToolbar';

function renderToolbar(
  props: {
    setPaletteOpen?: Dispatch<SetStateAction<boolean>>;
    onOpenNav?: () => void;
  } = {},
) {
  return renderWithProviders(
    <AppThemeProvider>
      <MobileToolbar
        setPaletteOpen={props.setPaletteOpen ?? (() => undefined)}
        onOpenNav={props.onOpenNav ?? (() => undefined)}
      />
    </AppThemeProvider>,
  );
}

describe('MobileToolbar', () => {
  it('renders the burger button, the search trigger and the logo', () => {
    renderToolbar();

    expect(
      screen.getByRole('button', { name: /Menü öffnen/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Suche öffnen/i }),
    ).toBeInTheDocument();
    expect(screen.getByAltText('koomiteh.dev')).toBeInTheDocument();
  });

  it('invokes setPaletteOpen(true) when the search trigger is clicked', () => {
    const setPaletteOpen = vi.fn();
    renderToolbar({ setPaletteOpen });

    fireEvent.click(screen.getByRole('button', { name: /Suche öffnen/i }));

    expect(setPaletteOpen).toHaveBeenCalledWith(true);
  });

  it('invokes onOpenNav when the burger button is clicked', () => {
    const onOpenNav = vi.fn();
    renderToolbar({ onOpenNav });

    fireEvent.click(screen.getByRole('button', { name: /Menü öffnen/i }));

    expect(onOpenNav).toHaveBeenCalledTimes(1);
  });
});
