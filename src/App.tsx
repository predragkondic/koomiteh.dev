import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from '@/components/AppShell';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { InterviewDetailPage } from '@/pages/InterviewDetailPage';
import { NotFoundPage } from '@/pages/NotFoundPage';

export function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<Navigate to="/interview" replace />} />
            <Route
              path="interview"
              element={<Navigate to="/interview/typescript/foo" replace />}
            />
            <Route
              path="interview/:language/:slug"
              element={<InterviewDetailPage />}
            />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
