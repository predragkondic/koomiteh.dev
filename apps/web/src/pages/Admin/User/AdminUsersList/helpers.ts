import type { AdminUserListItem, AdminUserRole } from "@/api/adminApi";

export type SortKey = "displayName" | "role" | "memberSince" | "status";
export type SortDir = "asc" | "desc";

export const SORT_KEYS: ReadonlyArray<SortKey> = [
  "displayName",
  "role",
  "memberSince",
  "status",
];

export const PAGE_SIZE = 10;

export function isSortKey(v: string | null): v is SortKey {
  return v !== null && (SORT_KEYS as readonly string[]).includes(v);
}

export function userStatus(row: AdminUserListItem): "active" | "suspended" {
  return row.suspendedAt !== null ? "suspended" : "active";
}

export function compareRows(
  a: AdminUserListItem,
  b: AdminUserListItem,
  key: SortKey,
) {
  if (key === "memberSince") {
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  }
  const av =
    key === "status"
      ? userStatus(a)
      : key === "displayName"
        ? a.displayName
        : a.role;
  const bv =
    key === "status"
      ? userStatus(b)
      : key === "displayName"
        ? b.displayName
        : b.role;
  return av.localeCompare(bv, undefined, { sensitivity: "base" });
}

export function canActOn(
  actor: { id: string; role: AdminUserRole | undefined } | undefined,
  target: AdminUserListItem,
): boolean {
  if (!actor || !actor.role) return false;
  if (actor.id === target.id) return false;
  if (actor.role === "admin") return target.role === "user";
  if (actor.role === "superadmin") {
    return target.role === "user" || target.role === "admin";
  }
  return false;
}
