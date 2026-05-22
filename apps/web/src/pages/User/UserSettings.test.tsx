import { describe, it, expect } from "vitest";
import { http, HttpResponse } from "msw";
import { screen } from "@testing-library/react";
import { server } from "@/test/msw-server";
import { renderWithProviders } from "@/test/render";
import { MySettingsPage } from "./UserSettingsPage";

const authedMe = {
  user: {
    id: "u1",
    githubLogin: "octocat",
    displayName: "The Octocat",
    avatarUrl: null,
    role: "user",
  },
};

describe("MySettingsPage", () => {
  it("zeigt einen Placeholder, wenn der User eingeloggt ist", async () => {
    server.use(
      http.get("http://localhost:3000/auth/me", () =>
        HttpResponse.json(authedMe),
      ),
    );

    renderWithProviders(<MySettingsPage />);

    expect(
      await screen.findByText(/Einstellungen kommen bald/i),
    ).toBeInTheDocument();
  });

  it("zeigt einen Login-Prompt und keinen Placeholder, wenn der User nicht eingeloggt ist", async () => {
    server.use(
      http.get("http://localhost:3000/auth/me", () =>
        HttpResponse.json({ user: null }),
      ),
    );

    renderWithProviders(<MySettingsPage />);

    expect(
      await screen.findByRole("link", { name: /Mit GitHub anmelden/ }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Einstellungen kommen bald/i)).toBeNull();
  });
});
