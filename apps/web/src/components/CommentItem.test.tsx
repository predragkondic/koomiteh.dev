import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import type { CommentItem as CommentData } from "@koomiteh/shared";
import { server } from "@/test/msw-server";
import { renderWithProviders } from "@/test/render";
import { CommentItem } from "./CommentItem";

const POST_ID = "typescript-junior-closures";

function makeComment(overrides: Partial<CommentData> = {}): CommentData {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    bodyHtmlSafe: "<p>hello</p>",
    bodyMd: "hello",
    createdAt: "2026-05-23T10:00:00.000Z",
    updatedAt: "2026-05-23T10:00:00.000Z",
    deletedAt: null,
    author: {
      id: "u1",
      displayName: "alice",
      avatarUrl: null,
    },
    ...overrides,
  };
}

describe("CommentItem", () => {
  it("shows an edit button when the viewer is the comment owner", () => {
    renderWithProviders(
      <CommentItem
        postId={POST_ID}
        comment={makeComment()}
        currentUserId="u1"
        isStaff={false}
      />,
    );
    expect(
      screen.getByRole("button", { name: /bearbeiten/i }),
    ).toBeInTheDocument();
  });

  it("hides the edit button when the viewer is not the owner", () => {
    renderWithProviders(
      <CommentItem
        postId={POST_ID}
        comment={makeComment()}
        currentUserId="u2"
        isStaff={false}
      />,
    );
    expect(
      screen.queryByRole("button", { name: /bearbeiten/i }),
    ).not.toBeInTheDocument();
  });

  it("hides the edit button even for admins on someone else's comment", () => {
    renderWithProviders(
      <CommentItem
        postId={POST_ID}
        comment={makeComment()}
        currentUserId="admin"
        isStaff={true}
      />,
    );
    expect(
      screen.queryByRole("button", { name: /bearbeiten/i }),
    ).not.toBeInTheDocument();
  });

  it("opens an edit-mode textarea pre-filled with the comment's bodyMd", () => {
    renderWithProviders(
      <CommentItem
        postId={POST_ID}
        comment={makeComment({ bodyMd: "old draft" })}
        currentUserId="u1"
        isStaff={false}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /bearbeiten/i }));
    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;
    expect(textarea).toBeInTheDocument();
    expect(textarea.value).toBe("old draft");
  });

  it("renders the draft in the Vorschau tab using the shared renderer", () => {
    renderWithProviders(
      <CommentItem
        postId={POST_ID}
        comment={makeComment({ bodyMd: "preview me" })}
        currentUserId="u1"
        isStaff={false}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /bearbeiten/i }));
    fireEvent.click(screen.getByRole("button", { name: /vorschau/i }));
    expect(screen.getByText("preview me")).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("submits a PATCH and exits edit-mode on Speichern", async () => {
    let received: { bodyMd?: string } | null = null;
    server.use(
      http.patch(
        "http://localhost:3000/comments/11111111-1111-1111-1111-111111111111",
        async ({ request }) => {
          received = (await request.json()) as { bodyMd: string };
          return HttpResponse.json({
            comment: {
              id: "11111111-1111-1111-1111-111111111111",
              bodyHtmlSafe: "<p>new body</p>",
              createdAt: "2026-05-23T10:00:00.000Z",
              updatedAt: "2026-05-23T11:00:00.000Z",
            },
          });
        },
      ),
      http.get(
        `http://localhost:3000/posts/${POST_ID}/comments`,
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

    renderWithProviders(
      <CommentItem
        postId={POST_ID}
        comment={makeComment({ bodyMd: "old" })}
        currentUserId="u1"
        isStaff={false}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /bearbeiten/i }));
    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: "new body" } });
    fireEvent.click(screen.getByRole("button", { name: /speichern/i }));
    await waitFor(() => {
      expect(received).not.toBeNull();
    });
    expect(received!.bodyMd).toBe("new body");
    await waitFor(() => {
      expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    });
  });

  it("exits edit-mode without saving on Abbrechen", () => {
    renderWithProviders(
      <CommentItem
        postId={POST_ID}
        comment={makeComment({ bodyMd: "old" })}
        currentUserId="u1"
        isStaff={false}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /bearbeiten/i }));
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "should not save" },
    });
    fireEvent.click(screen.getByRole("button", { name: /abbrechen/i }));
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("triggers Save when the user hits Cmd/Ctrl+Enter in the textarea", async () => {
    let calls = 0;
    server.use(
      http.patch(
        "http://localhost:3000/comments/11111111-1111-1111-1111-111111111111",
        () => {
          calls += 1;
          return HttpResponse.json({
            comment: {
              id: "11111111-1111-1111-1111-111111111111",
              bodyHtmlSafe: "<p>new</p>",
              createdAt: "2026-05-23T10:00:00.000Z",
              updatedAt: "2026-05-23T11:00:00.000Z",
            },
          });
        },
      ),
      http.get(
        `http://localhost:3000/posts/${POST_ID}/comments`,
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

    renderWithProviders(
      <CommentItem
        postId={POST_ID}
        comment={makeComment({ bodyMd: "old" })}
        currentUserId="u1"
        isStaff={false}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /bearbeiten/i }));
    const textarea = screen.getByRole("textbox");
    fireEvent.change(textarea, { target: { value: "via shortcut" } });
    fireEvent.keyDown(textarea, { key: "Enter", metaKey: true });
    await waitFor(() => {
      expect(calls).toBe(1);
    });
  });
});
