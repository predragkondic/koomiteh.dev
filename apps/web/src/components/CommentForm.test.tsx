import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { server } from "@/test/msw-server";
import { renderWithProviders } from "@/test/render";
import { CommentForm } from "./CommentForm";

const POST_ID = "typescript-junior-closures";

const ANON_ME = { user: null };
const USER_ME = {
  user: {
    id: "u1",
    githubLogin: "alice",
    displayName: "alice",
    avatarUrl: null,
    role: "user" as const,
  },
};

function mockMe(body: typeof ANON_ME | typeof USER_ME) {
  server.use(
    http.get("http://localhost:3000/auth/me", () => HttpResponse.json(body)),
  );
}

describe("CommentForm", () => {
  it("shows a login CTA when no user is signed in", async () => {
    mockMe(ANON_ME);
    renderWithProviders(<CommentForm postId={POST_ID} />);
    expect(
      await screen.findByRole("link", { name: /sign in to comment/i }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("renders a textarea and submit button for a signed-in user", async () => {
    mockMe(USER_ME);
    renderWithProviders(<CommentForm postId={POST_ID} />);
    expect(await screen.findByRole("textbox")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /post comment/i }),
    ).toBeInTheDocument();
  });

  it("submits a POST and clears the textarea on success", async () => {
    mockMe(USER_ME);
    let received: { bodyMd?: string } | null = null;
    server.use(
      http.post(
        `http://localhost:3000/posts/${POST_ID}/comments`,
        async ({ request }) => {
          received = (await request.json()) as { bodyMd: string };
          return HttpResponse.json(
            {
              comment: {
                id: "33333333-3333-3333-3333-333333333333",
                bodyHtmlSafe: "<p>hi there</p>",
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              },
            },
            { status: 201 },
          );
        },
      ),
    );
    renderWithProviders(<CommentForm postId={POST_ID} />);
    const textarea = await screen.findByRole("textbox");
    fireEvent.change(textarea, { target: { value: "hi there" } });
    fireEvent.click(screen.getByRole("button", { name: /post comment/i }));
    await waitFor(() => {
      expect(received).not.toBeNull();
    });
    expect(received!.bodyMd).toBe("hi there");
    await waitFor(() => {
      expect((textarea as HTMLTextAreaElement).value).toBe("");
    });
  });

  it("disables submit while body is empty or whitespace", async () => {
    mockMe(USER_ME);
    renderWithProviders(<CommentForm postId={POST_ID} />);
    const button = await screen.findByRole("button", { name: /post comment/i });
    expect(button).toBeDisabled();
    const textarea = screen.getByRole("textbox");
    fireEvent.change(textarea, { target: { value: "   " } });
    expect(button).toBeDisabled();
    fireEvent.change(textarea, { target: { value: "ok" } });
    expect(button).toBeEnabled();
  });
});
