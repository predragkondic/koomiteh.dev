import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "@/components/AppShell";
import { ConfirmProvider } from "@/components/ConfirmProvider";
import { DevHealthBanner } from "@/components/DevHealthBanner";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { config } from "@/config";
import { AdminLayout } from "@/pages/Admin";

import { UserFavoritesPage } from "@/pages/User/Favorites";
import { MyProfilePage } from "@/pages/User/MyProfilePage";
import { MySettingsPage } from "@/pages/User/UserSettingsPage";
import { UserProfilePage } from "@/pages/User/UserProfile";
import { NotFoundPage } from "@/pages/Layout/NotFoundPage";
import AdminUsersListPage from "./pages/Admin/User/AdminUsersList/index";
import { AdminPostsListPage } from "./pages/Admin/Post/List";
import { AdminPostEditorPage } from "./pages/Admin/Post/View/AdminPostEditorPage";
import { AdminPostGeneratePage } from "./pages/Admin/Post/View/AdminPostGeneratePage";
import { PostLayout } from "./pages/Post";
import { PostListingPage } from "./pages/Post/List";
import { PostHubPage } from "./pages/Post/PostHubPage";
import { PostDetailPage } from "./pages/Post/View";

export function App() {
  return (
    <ErrorBoundary>
      <ConfirmProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<AppShell />}>
              <Route index element={<Navigate to="/post" replace />} />
              <Route path="post" element={<PostLayout />}>
                <Route index element={<PostHubPage />} />
                <Route path=":language" element={<PostListingPage />} />
                <Route path=":language/:slug" element={<PostDetailPage />} />
              </Route>
              <Route path="me/favorites" element={<UserFavoritesPage />} />
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
