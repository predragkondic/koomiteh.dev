/** Staff roles that may access `/admin` (see ADR-0010). */
export type StaffRole = 'admin' | 'superadmin';

export function isStaffRole(
  role: string | undefined | null,
): role is StaffRole {
  return role === 'admin' || role === 'superadmin';
}
