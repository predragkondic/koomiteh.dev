import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { Route, Routes } from 'react-router-dom';
import { screen } from '@testing-library/react';
import { server } from '@/test/msw-server';
import { renderWithProviders } from '@/test/render';
import type { Manifest } from '@/types';
import { InterviewHubPage } from './InterviewHubPage';

function manifestHandler(manifest: Manifest) {
  return http.get('/content/manifest.json', () => HttpResponse.json(manifest));
}

describe('InterviewHubPage', () => {
  it('renders one tile per language with counts', async () => {
    server.use(
      manifestHandler({
        languages: [
          { id: 'typescript', displayName: 'TypeScript', count: 12 },
          { id: 'javascript', displayName: 'JavaScript', count: 7 },
        ],
        totalCount: 19,
        builtAt: '2026-04-30T00:00:00.000Z',
      }),
    );

    renderWithProviders(<InterviewHubPage />);

    expect(
      await screen.findByRole('heading', { level: 2, name: 'TypeScript' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: 'JavaScript' }),
    ).toBeInTheDocument();
    expect(screen.getByText('12 Fragen')).toBeInTheDocument();
    expect(screen.getByText('7 Fragen')).toBeInTheDocument();

    const tsLink = screen.getByRole('link', { name: /TypeScript/ });
    expect(tsLink).toHaveAttribute('href', '/interview/typescript');
  });

  it('redirects to the only language when manifest has exactly one', async () => {
    server.use(
      manifestHandler({
        languages: [{ id: 'typescript', displayName: 'TypeScript', count: 5 }],
        totalCount: 5,
        builtAt: '2026-04-30T00:00:00.000Z',
      }),
    );

    renderWithProviders(
      <Routes>
        <Route path="/interview" element={<InterviewHubPage />} />
        <Route
          path="/interview/:language"
          element={<div data-testid="listing">listing</div>}
        />
      </Routes>,
      { initialEntries: ['/interview'] },
    );

    expect(await screen.findByTestId('listing')).toBeInTheDocument();
  });

  it('renders an error alert when manifest fetch fails', async () => {
    server.use(
      http.get('/content/manifest.json', () =>
        HttpResponse.json({ message: 'boom' }, { status: 500 }),
      ),
    );

    renderWithProviders(<InterviewHubPage />);

    expect(
      await screen.findByText(/Sprachen konnten nicht geladen werden\./),
    ).toBeInTheDocument();
  });
});
