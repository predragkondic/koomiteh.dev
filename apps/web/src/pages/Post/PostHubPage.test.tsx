import { describe, it, expect } from "vitest";
import { http, HttpResponse } from "msw";
import { Route, Routes } from "react-router-dom";
import { screen } from "@testing-library/react";
import type { Manifest } from "@koomiteh/shared";
import { server } from "@/test/msw-server";
import { renderWithProviders } from "@/test/render";
import { PostHubPage } from "./PostHubPage";

function manifestHandler(manifest: Manifest) {
  return http.get("http://localhost:3000/posts/manifest", () =>
    HttpResponse.json(manifest),
  );
}

describe("PostHubPage", () => {
  it("renders one tile per language with counts", async () => {
    server.use(
      manifestHandler({
        languages: [
          { id: "typescript", displayName: "TypeScript", count: 12 },
          { id: "javascript", displayName: "JavaScript", count: 7 },
        ],
        totalCount: 19,
        builtAt: "2026-04-30T00:00:00.000Z",
      }),
    );

    renderWithProviders(<PostHubPage />);

    expect(
      await screen.findByRole("heading", { level: 2, name: "TypeScript" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "JavaScript" }),
    ).toBeInTheDocument();
    expect(screen.getByText("12 Fragen")).toBeInTheDocument();
    expect(screen.getByText("7 Fragen")).toBeInTheDocument();

    const tsLink = screen.getByRole("link", { name: /TypeScript/ });
    expect(tsLink).toHaveAttribute("href", "/post/typescript");
  });

  it("redirects to the only language when manifest has exactly one", async () => {
    server.use(
      manifestHandler({
        languages: [{ id: "typescript", displayName: "TypeScript", count: 5 }],
        totalCount: 5,
        builtAt: "2026-04-30T00:00:00.000Z",
      }),
    );

    renderWithProviders(
      <Routes>
        <Route path="/post" element={<PostHubPage />} />
        <Route
          path="/post/:language"
          element={<div data-testid="listing">listing</div>}
        />
      </Routes>,
      { initialEntries: ["/post"] },
    );

    expect(await screen.findByTestId("listing")).toBeInTheDocument();
  });

  it("renders an error alert when manifest fetch fails", async () => {
    server.use(
      http.get("http://localhost:3000/posts/manifest", () =>
        HttpResponse.json({ message: "boom" }, { status: 500 }),
      ),
    );

    renderWithProviders(<PostHubPage />);

    expect(
      await screen.findByText(/Sprachen konnten nicht geladen werden\./),
    ).toBeInTheDocument();
  });
});
