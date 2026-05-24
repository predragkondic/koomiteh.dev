import { afterEach, describe, expect, it, vi } from "vitest";
import { Route, Routes, useLocation } from "react-router-dom";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw-server";
import { renderWithProviders } from "@/test/render";
import { PostDetailPage } from ".";

const ADMIN_ME = {
  user: {
    id: "u1",
    githubLogin: "admin",
    displayName: "Admin",
    avatarUrl: null,
    role: "admin" as const,
  },
};

const ACTIVE_POST = {
  frontmatter: {
    id: "typescript-junior-closures",
    slug: "what-is-a-closure",
    question: "What is a closure?",
    language: "typescript",
    level: "junior" as const,
    tags: ["closures", "scope"],
    createdAt: "2026-01-10T00:00:00.000Z",
    updatedAt: "2026-04-05T00:00:00.000Z",
    deletedAt: null,
  },
  bodyMd: "A **closure** keeps access to its outer scope.",
};

afterEach(() => {
  vi.restoreAllMocks();
});

function setupActiveAdminHandlers() {
  server.use(
    http.get("http://localhost:3000/auth/me", () =>
      HttpResponse.json(ADMIN_ME),
    ),
    http.get("http://localhost:3000/me/favorites/ids", () =>
      HttpResponse.json({ ids: [] }),
    ),
    http.get(
      "http://localhost:3000/posts/by-slug/typescript/what-is-a-closure",
      () =>
        HttpResponse.json({
          frontmatter: {
            ...ACTIVE_POST.frontmatter,
            deletedAt: undefined,
          },
          bodyMd: ACTIVE_POST.bodyMd,
        }),
    ),
    http.get("http://localhost:3000/posts", () =>
      HttpResponse.json({
        items: [
          {
            ...ACTIVE_POST.frontmatter,
          },
        ],
        page: 1,
        pageSize: 20,
        total: 1,
        pageCount: 1,
      }),
    ),
  );
}

function PathnameProbe() {
  const location = useLocation();
  return <output data-testid="pathname">{location.pathname}</output>;
}

function renderPage(initialEntries = ["/post/typescript/what-is-a-closure"]) {
  return renderWithProviders(
    <Routes>
      <Route
        path="/post/:language/:slug"
        element={
          <>
            <PostDetailPage />
            <PathnameProbe />
          </>
        }
      />
    </Routes>,
    { initialEntries },
  );
}

describe("PostDetailPage", () => {
  it("falls back to the admin detail fetch when the public permalink returns 410", async () => {
    server.use(
      http.get("http://localhost:3000/auth/me", () =>
        HttpResponse.json(ADMIN_ME),
      ),
      http.get(
        "http://localhost:3000/posts/by-slug/typescript/what-is-a-closure",
        () =>
          HttpResponse.json(
            {
              error: "gone",
              id: "typescript-junior-closures",
              language: "typescript",
              slug: "what-is-a-closure",
            },
            { status: 410 },
          ),
      ),
      http.get(
        "http://localhost:3000/admin/posts/typescript-junior-closures",
        () =>
          HttpResponse.json({
            ...ACTIVE_POST,
            frontmatter: {
              ...ACTIVE_POST.frontmatter,
              deletedAt: "2026-05-01T00:00:00.000Z",
            },
          }),
      ),
    );

    renderPage();

    expect(
      await screen.findByRole("heading", { name: /What is a closure\?/i }),
    ).toBeInTheDocument();
    expect(
      await screen.findByText(/keeps access to its outer scope\./i, {
        selector: "p",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Wiederherstellen/i }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("pathname")).toHaveTextContent(
      "/post/typescript/what-is-a-closure",
    );
  });

  it("shows an admin actions menu with edit and delete for active posts", async () => {
    setupActiveAdminHandlers();

    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: /Aktionen/i }));

    expect(await screen.findByRole("menu")).toBeInTheDocument();
    expect(
      screen.getByRole("menuitem", { name: /Bearbeiten/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("menuitem", { name: /Löschen/i }),
    ).toBeInTheDocument();
  });

  it("keeps the admin on the same permalink and switches to the deleted detail state after delete", async () => {
    let deleted = false;
    let deleteCalls = 0;

    server.use(
      http.get("http://localhost:3000/auth/me", () =>
        HttpResponse.json(ADMIN_ME),
      ),
      http.get("http://localhost:3000/me/favorites/ids", () =>
        HttpResponse.json({ ids: [] }),
      ),
      http.get(
        "http://localhost:3000/posts/by-slug/typescript/what-is-a-closure",
        () =>
          deleted
            ? HttpResponse.json(
                {
                  error: "gone",
                  id: "typescript-junior-closures",
                  language: "typescript",
                  slug: "what-is-a-closure",
                },
                { status: 410 },
              )
            : HttpResponse.json({
                frontmatter: {
                  ...ACTIVE_POST.frontmatter,
                  deletedAt: undefined,
                },
                bodyMd: ACTIVE_POST.bodyMd,
              }),
      ),
      http.get("http://localhost:3000/posts", () =>
        HttpResponse.json({
          items: [{ ...ACTIVE_POST.frontmatter }],
          page: 1,
          pageSize: 20,
          total: 1,
          pageCount: 1,
        }),
      ),
      http.delete(
        "http://localhost:3000/admin/posts/typescript-junior-closures",
        () => {
          deleteCalls += 1;
          deleted = true;
          return HttpResponse.json({ ok: true, deleted: true });
        },
      ),
      http.get(
        "http://localhost:3000/admin/posts/typescript-junior-closures",
        () =>
          HttpResponse.json({
            ...ACTIVE_POST,
            frontmatter: {
              ...ACTIVE_POST.frontmatter,
              deletedAt: "2026-05-01T00:00:00.000Z",
            },
          }),
      ),
    );

    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: /Aktionen/i }));
    fireEvent.click(await screen.findByRole("menuitem", { name: /Löschen/i }));

    const dialog = await screen.findByRole("dialog");
    fireEvent.click(
      await within(dialog).findByRole("button", { name: /Löschen/i }),
    );
    await waitFor(() => expect(deleteCalls).toBe(1));

    expect(screen.getByTestId("pathname")).toHaveTextContent(
      "/post/typescript/what-is-a-closure",
    );
  });

  it("shows edit and restore for deleted posts and restores the active detail view on the same permalink", async () => {
    let deleted = true;
    let restoreCalls = 0;

    server.use(
      http.get("http://localhost:3000/auth/me", () =>
        HttpResponse.json(ADMIN_ME),
      ),
      http.get("http://localhost:3000/me/favorites/ids", () =>
        HttpResponse.json({ ids: [] }),
      ),
      http.get(
        "http://localhost:3000/posts/by-slug/typescript/what-is-a-closure",
        () =>
          deleted
            ? HttpResponse.json(
                {
                  error: "gone",
                  id: "typescript-junior-closures",
                  language: "typescript",
                  slug: "what-is-a-closure",
                },
                { status: 410 },
              )
            : HttpResponse.json({
                frontmatter: {
                  ...ACTIVE_POST.frontmatter,
                  deletedAt: undefined,
                },
                bodyMd: ACTIVE_POST.bodyMd,
              }),
      ),
      http.get(
        "http://localhost:3000/admin/posts/typescript-junior-closures",
        () =>
          HttpResponse.json({
            ...ACTIVE_POST,
            frontmatter: {
              ...ACTIVE_POST.frontmatter,
              deletedAt: deleted ? "2026-05-01T00:00:00.000Z" : null,
            },
          }),
      ),
      http.post(
        "http://localhost:3000/admin/posts/typescript-junior-closures/restore",
        () => {
          restoreCalls += 1;
          deleted = false;
          return HttpResponse.json({ ok: true, deleted: false });
        },
      ),
      http.get("http://localhost:3000/posts", () =>
        HttpResponse.json({
          items: [{ ...ACTIVE_POST.frontmatter }],
          page: 1,
          pageSize: 20,
          total: 1,
          pageCount: 1,
        }),
      ),
    );

    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: /Aktionen/i }));
    expect(
      await screen.findByRole("menuitem", { name: /Bearbeiten/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("menuitem", { name: /Wiederherstellen/i }),
    ).toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole("menu"), { key: "Escape" });
    fireEvent.click(
      await screen.findByRole("button", { name: /Wiederherstellen/i }),
    );
    await waitFor(() => expect(restoreCalls).toBe(1));

    expect(
      await screen.findByRole("button", { name: /Zu Favoriten hinzufügen/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Wiederherstellen/i }),
    ).toBeNull();
    expect(screen.getByTestId("pathname")).toHaveTextContent(
      "/post/typescript/what-is-a-closure",
    );
  });

  it("mounts a comments section with a heading and the comment form under an active post", async () => {
    setupActiveAdminHandlers();
    server.use(
      http.get(
        "http://localhost:3000/posts/typescript-junior-closures/comments",
        () =>
          HttpResponse.json({
            items: [],
            page: 1,
            pageSize: 20,
            total: 0,
            pageCount: 0,
          }),
      ),
    );

    renderPage();

    expect(
      await screen.findByRole("heading", { name: /Kommentare \(0\)/i }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole("textbox", { name: /Comment body/i }),
    ).toBeInTheDocument();
  });

  it("keeps non-admin users on the removed-post state when the public permalink returns 410", async () => {
    server.use(
      http.get("http://localhost:3000/auth/me", () =>
        HttpResponse.json({
          user: {
            ...ADMIN_ME.user,
            role: "user",
          },
        }),
      ),
      http.get(
        "http://localhost:3000/posts/by-slug/typescript/what-is-a-closure",
        () =>
          HttpResponse.json(
            {
              error: "gone",
              id: "typescript-junior-closures",
              language: "typescript",
              slug: "what-is-a-closure",
            },
            { status: 410 },
          ),
      ),
    );

    renderPage();

    expect(
      await screen.findByRole("heading", { name: /Frage entfernt/i }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Aktionen/i })).toBeNull();
    expect(
      screen.queryByRole("button", { name: /Wiederherstellen/i }),
    ).toBeNull();
  });
});
