import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "@/components/AppShell";
import { ConfirmProvider } from "@/components/ConfirmProvider";
import { DevHealthBanner } from "@/components/DevHealthBanner";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { config } from "@/config";
import { AdminLayout } from "@/pages/Admin/AdminLayout";

import { InterviewDetailPage } from "@/pages/InterviewDetailPage";
import { InterviewHubPage } from "@/pages/InterviewHubPage";
import { InterviewLayout } from "@/pages/InterviewLayout";
import { InterviewListingPage } from "@/pages/InterviewListingPage";
import { MyFavoritesPage } from "@/pages/MyFavoritesPage";
import { MyProfilePage } from "@/pages/MyProfilePage";
import { MySettingsPage } from "@/pages/MySettingsPage";
import { UserProfilePage } from "@/pages/UserProfilePage";
import { NotFoundPage } from "@/pages/NotFoundPage";
import AdminUsersListPage from "./pages/Admin/User/AdminUsersList/index";
import { AdminPostsListPage } from "./pages/Admin/Post/List";
import { AdminPostEditorPage } from "./pages/Admin/Post/View/AdminPostEditorPage";
import { AdminPostGeneratePage } from "./pages/Admin/Post/View/AdminPostGeneratePage";

export function App() {
  return (
    <ErrorBoundary>
      <ConfirmProvider>
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
              <Route path="me/favorites" element={<MyFavoritesPage />} />
              <Route path="me/settings" element={<MySettingsPage />} />
              <Route path="me" element={<MyProfilePage />} />
              <Route path="users/:id" element={<UserProfilePage />} />
              <Route path="admin" element={<AdminLayout />}>
                <Route index element={<AdminPostsListPage />} />
                <Route path="users" element={<AdminUsersListPage />} />
                <Route
                  path="posts/new"
                  element={<AdminPostEditorPage mode="new" />}
                />
                <Route
                  path="posts/generate"
                  element={<AdminPostGeneratePage />}
                />
                <Route
                  path="posts/:id/edit"
                  element={<AdminPostEditorPage mode="edit" />}
                />
              </Route>
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </ConfirmProvider>
      {config.isDev && <DevHealthBanner />}
    </ErrorBoundary>
  );
}
