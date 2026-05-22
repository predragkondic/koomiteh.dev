import { describe, it, expect } from "vitest";
import { http, HttpResponse } from "msw";
import { Route, Routes } from "react-router-dom";
import { screen } from "@testing-library/react";
import { server } from "@/test/msw-server";
import { renderWithProviders } from "@/test/render";
import { UserProfilePage } from "./UserProfile";

const authedMe = {
  user: {
    id: "u-viewer",
    githubLogin: "viewer",
    displayName: "Viewer",
    avatarUrl: null,
    role: "user" as const,
  },
};

const targetProfile = {
  id: "u-target",
  displayName: "The Octocat",
  avatarUrl: "https://avatars.example/octocat.png",
  githubLogin: "octocat",
  createdAt: "2026-05-15T10:00:00.000Z",
};

function renderPage(id = "u-target") {
  return renderWithProviders(
    <Routes>
      <Route path="/users/:id" element={<UserProfilePage />} />
    </Routes>,
    { initialEntries: [`/users/${id}`] },
  );
}

describe("UserProfilePage", () => {
  it("zeigt einen Login-Prompt, wenn der User nicht eingeloggt ist", async () => {
    server.use(
      http.get("http://localhost:3000/auth/me", () =>
        HttpResponse.json({ user: null }),
      ),
    );

    renderPage();

    expect(
      await screen.findByRole("link", { name: /Mit GitHub anmelden/ }),
    ).toBeInTheDocument();
  });

  it("zeigt Profil-Daten des angefragten Users, wenn der Viewer eingeloggt ist", async () => {
    server.use(
      http.get("http://localhost:3000/auth/me", () =>
        HttpResponse.json(authedMe),
      ),
      http.get("http://localhost:3000/users/u-target", () =>
        HttpResponse.json(targetProfile),
      ),
    );

    renderPage("u-target");

    expect(await screen.findByText("The Octocat")).toBeInTheDocument();
    expect(screen.getByText("octocat")).toBeInTheDocument();
    expect(screen.getByText(/Mitglied seit Mai 2026/i)).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: /The Octocat/i }),
    ).toBeInTheDocument();
  });

  it("zeigt den [deleted]-State, wenn die API 410 Gone liefert", async () => {
    server.use(
      http.get("http://localhost:3000/auth/me", () =>
        HttpResponse.json(authedMe),
      ),
      http.get("http://localhost:3000/users/u-gone", () =>
        HttpResponse.json(
          {
            error: "gone",
            id: "u-gone",
            displayName: "[deleted]",
            avatarUrl: null,
            githubLogin: null,
            createdAt: "2026-05-15T10:00:00.000Z",
          },
          { status: 410 },
        ),
      ),
    );

    renderPage("u-gone");

    expect(
      await screen.findByText(/Dieser User wurde gelöscht/i),
    ).toBeInTheDocument();
    expect(screen.queryByText("octocat")).toBeNull();
  });
});
