import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { screen } from "@testing-library/react";
import type { CommentListResponse } from "@koomiteh/shared";
import { server } from "@/test/msw-server";
import { renderWithProviders } from "@/test/render";
import { CommentList } from "./CommentList";

const POST_ID = "typescript-junior-closures";

function listResponse(
  overrides: Partial<CommentListResponse> & {
    items: CommentListResponse["items"];
  },
): CommentListResponse {
  return {
    page: 1,
    pageSize: 20,
    total: overrides.items.length,
    pageCount: 1,
    ...overrides,
  };
}

describe("CommentList", () => {
  it("renders comments returned by the API with author display name", async () => {
    server.use(
      http.get(`http://localhost:3000/posts/${POST_ID}/comments`, () =>
        HttpResponse.json(
          listResponse({
            items: [
              {
                id: "11111111-1111-1111-1111-111111111111",
                bodyHtmlSafe: "<p>hello world</p>",
                createdAt: "2026-05-23T10:00:00.000Z",
                updatedAt: "2026-05-23T10:00:00.000Z",
                deletedAt: null,
                author: {
                  id: "u1",
                  displayName: "alice",
                  avatarUrl: null,
                },
              },
            ],
          }),
        ),
      ),
    );
    renderWithProviders(<CommentList postId={POST_ID} />);
    expect(await screen.findByText("hello world")).toBeInTheDocument();
    expect(screen.getByText("alice")).toBeInTheDocument();
  });

  it("renders soft-deleted comments as [deleted] with no author chip", async () => {
    server.use(
      http.get(`http://localhost:3000/posts/${POST_ID}/comments`, () =>
        HttpResponse.json(
          listResponse({
            items: [
              {
                id: "22222222-2222-2222-2222-222222222222",
                bodyHtmlSafe: "[deleted]",
                createdAt: "2026-05-23T10:00:00.000Z",
                updatedAt: "2026-05-23T10:00:00.000Z",
                deletedAt: "2026-05-23T10:05:00.000Z",
                author: null,
              },
            ],
          }),
        ),
      ),
    );
    renderWithProviders(<CommentList postId={POST_ID} />);
    const markers = await screen.findAllByText("[deleted]");
    expect(markers.length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText("alice")).not.toBeInTheDocument();
  });

  it("renders an empty state when no comments exist", async () => {
    server.use(
      http.get(`http://localhost:3000/posts/${POST_ID}/comments`, () =>
        HttpResponse.json(listResponse({ items: [] })),
      ),
    );
    renderWithProviders(<CommentList postId={POST_ID} />);
    expect(
      await screen.findByText(/no comments yet/i),
    ).toBeInTheDocument();
  });
});
