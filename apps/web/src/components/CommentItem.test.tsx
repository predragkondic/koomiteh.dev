import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import type { CommentItem as CommentData } from "@koomiteh/shared";
import { renderWithProviders } from "@/test/render";
import { CommentItem } from "./CommentItem";

function makeComment(overrides: Partial<CommentData> = {}): CommentData {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    bodyHtmlSafe: "<p>hello</p>",
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
        comment={makeComment()}
        currentUserId="admin"
        isStaff={true}
      />,
    );
    expect(
      screen.queryByRole("button", { name: /bearbeiten/i }),
    ).not.toBeInTheDocument();
  });
});
