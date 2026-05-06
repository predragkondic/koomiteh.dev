import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from '@/components/AppShell';
import { DevHealthBanner } from '@/components/DevHealthBanner';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { config } from '@/config';
import { InterviewDetailPage } from '@/pages/InterviewDetailPage';
import { InterviewHubPage } from '@/pages/InterviewHubPage';
import { InterviewLayout } from '@/pages/InterviewLayout';
import { InterviewListingPage } from '@/pages/InterviewListingPage';
import { NotFoundPage } from '@/pages/NotFoundPage';

export function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<Navigate to="/interview" replace />} />
            <Route path="interview" element={<InterviewLayout />}>
              <Route index element={<InterviewHubPage />} />
              <Route path=":language" element={<InterviewListingPage />} />
              <Route
                path=":language/:slug"
                element={<InterviewDetailPage />}
              />
            </Route>
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
      {config.isDev && <DevHealthBanner />}
    </ErrorBoundary>
  );
}
