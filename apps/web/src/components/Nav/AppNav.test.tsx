import type { ReactElement } from "react";
import { describe, it, expect, beforeEach } from "vitest";
import { http, HttpResponse, type JsonBodyType } from "msw";
import { fireEvent, screen } from "@testing-library/react";
import { Routes, Route } from "react-router-dom";
import { server } from "@/test/msw-server";
import { renderWithProviders } from "@/test/render";
import { AppThemeProvider } from "@/theme/ThemeContext";
import { AppSidebar } from "./AppSidebar";
import { AppBottomNav } from "./AppBottomNav";

const SIDEBAR_COLLAPSED_STORAGE_KEY = "nav.sidebar.collapsed";

beforeEach(() => {
  window.localStorage.removeItem(SIDEBAR_COLLAPSED_STORAGE_KEY);
});

function mockMe(body: JsonBodyType) {
  server.use(
    http.get("http://localhost:3000/auth/me", () => HttpResponse.json(body)),
    http.get("http://localhost:3000/posts/manifest", () =>
      HttpResponse.json({
        languages: [
          { id: "typescript", displayName: "TypeScript", count: 124 },
        ],
        totalCount: 124,
        builtAt: new Date().toISOString(),
      }),
    ),
  );
}

const USER_ME = {
  user: {
    id: "u1",
    githubLogin: "alice",
    displayName: "Alice",
    avatarUrl: null,
    role: "user" as const,
  },
};
const ADMIN_ME = {
  user: {
    id: "u2",
    githubLogin: "root",
    displayName: "Root",
    avatarUrl: null,
    role: "admin" as const,
  },
};

function renderNav(ui: ReactElement, initialEntries: string[] = ["/post"]) {
  return renderWithProviders(
    <AppThemeProvider>
      <Routes>
        <Route path="*" element={ui} />
      </Routes>
    </AppThemeProvider>,
    { initialEntries },
  );
}

describe("AppSidebar", () => {
  it("renders profile submenu with active settings child on /me/settings", async () => {
    mockMe(USER_ME);
    renderNav(<AppSidebar />, ["/me/settings"]);

    const profile = await screen.findByRole("link", { name: /^Profil$/i });
    expect(profile).toHaveAttribute("href", "/me");
    expect(profile.className).not.toMatch(/Mui-selected/);
    expect(screen.getByRole("link", { name: /Beiträge/i })).toHaveAttribute(
      "href",
      "/post",
    );
    const settings = screen.getByRole("link", { name: /Einstellungen/i });
    expect(settings).toHaveAttribute("href", "/me/settings");
    expect(settings.className).toMatch(/Mui-selected/);
    expect(
      screen.getByRole("link", { name: /Favoriten/i }).className,
    ).not.toMatch(/Mui-selected/);
    expect(
      screen.getByRole("button", { name: /Abmelden/i }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /^Admin$/i })).toBeNull();
  });

  it("renders Admin link for staff on frontend", async () => {
    mockMe(ADMIN_ME);
    renderNav(<AppSidebar />, ["/post"]);

    expect(
      await screen.findByRole("link", { name: /^Admin$/i }),
    ).toHaveAttribute("href", "/admin");
  });

  it("renders admin-mode items", async () => {
    mockMe(ADMIN_ME);
    renderNav(<AppSidebar />, ["/admin"]);

    expect(
      await screen.findByRole("link", { name: /Exit Admin/i }),
    ).toHaveAttribute("href", "/post");
    expect(screen.getByRole("link", { name: /Beiträge/i })).toHaveAttribute(
      "href",
      "/admin",
    );
    expect(screen.getByRole("link", { name: /^User$/i })).toHaveAttribute(
      "href",
      "/admin/users",
    );
  });

  it("hides admin-mode items for non-staff visiting /admin", async () => {
    mockMe(USER_ME);
    renderNav(<AppSidebar />, ["/admin"]);

    expect(
      await screen.findByRole("link", { name: /^Profil$/i }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Exit Admin/i })).toBeNull();
    expect(screen.queryByRole("link", { name: /^User$/i })).toBeNull();
  });

  it("shows the language and theme toggles when expanded", async () => {
    mockMe(USER_ME);
    renderNav(<AppSidebar />, ["/post"]);

    await screen.findByRole("link", { name: /^Profil$/i });
    expect(screen.getByRole("group", { name: /Sprache/i })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Switch to (dark|light) mode/i }),
    ).toBeInTheDocument();
  });

  it("hides the language and theme toggles when collapsed and toggles via the menu button", async () => {
    window.localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, "1");
    mockMe(USER_ME);
    renderNav(<AppSidebar />, ["/post"]);

    await screen.findByRole("button", { name: /Seitenleiste ausklappen/i });
    expect(screen.queryByRole("group", { name: /Sprache/i })).toBeNull();
    expect(
      screen.queryByRole("button", { name: /Switch to (dark|light) mode/i }),
    ).toBeNull();

    fireEvent.click(
      screen.getByRole("button", { name: /Seitenleiste ausklappen/i }),
    );

    expect(
      await screen.findByRole("group", { name: /Sprache/i }),
    ).toBeInTheDocument();
  });
});

describe("AppBottomNav", () => {
  it("renders flat frontend items without submenu links", async () => {
    mockMe(USER_ME);
    renderNav(<AppBottomNav />, ["/post"]);

    expect(
      await screen.findByRole("link", { name: /^Profil$/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Beiträge/i })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Einstellungen/i })).toBeNull();
    expect(
      screen.getByRole("button", { name: /Abmelden/i }),
    ).toBeInTheDocument();
  });
});
