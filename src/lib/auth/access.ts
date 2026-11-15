// Who may do what, as plain rules with no database or framework imports, so
// the request gate (src/proxy.ts), the sign-in callbacks (src/auth.ts) and
// the pages all share one definition.

export type UserRole = "admin" | "staff" | "viewer" | "pending";

export const USER_ROLES: readonly UserRole[] = [
  "pending",
  "viewer",
  "staff",
  "admin",
];

/** Roles an admin can hand out. "pending" is only ever the starting state. */
export const ASSIGNABLE_ROLES: readonly UserRole[] = ["viewer", "staff", "admin"];

const RANK: Record<UserRole, number> = {
  pending: 0,
  viewer: 1,
  staff: 2,
  admin: 3,
};

export const ROLE_LABELS: Record<UserRole, string> = {
  pending: "Waiting for approval",
  viewer: "Viewer",
  staff: "Staff",
  admin: "Admin",
};

export function isUserRole(value: unknown): value is UserRole {
  return typeof value === "string" && value in RANK;
}

/** True when `role` is `atLeast` or higher. An unknown or missing role is never enough. */
export function hasRole(role: unknown, atLeast: UserRole): boolean {
  return isUserRole(role) && RANK[role] >= RANK[atLeast];
}

/** Signed in AND approved. A pending person is signed in but sees nothing. */
export function canUseSite(role: unknown): boolean {
  return hasRole(role, "viewer");
}

/**
 * How long a signed-in browser goes before its role is read from the
 * database again. This is how long a removal or a role change takes to bite.
 * Someone waiting for approval is checked on every request (there are only
 * ever a few of them), so they get in the moment an admin approves them.
 */
export function recheckAfterMs(role: unknown): number {
  return canUseSite(role) ? 60_000 : 0;
}

/**
 * Whether Microsoft's answer to a token refresh means the person can no
 * longer sign in (account disabled or deleted, password changed, sign-ins
 * revoked, consent withdrawn), as opposed to a passing fault.
 *
 * Microsoft answers 400 or 401 with one of these `error` codes when the
 * refresh token is no good; anything else (a timeout, a 5xx, throttling) is
 * worth trying again on the next request without throwing the person out.
 */
export function isDefinitiveRefreshFailure(status: number, body: unknown): boolean {
  if (status !== 400 && status !== 401) return false;
  const code =
    body && typeof body === "object" && "error" in body
      ? String((body as { error: unknown }).error)
      : "";
  return [
    "invalid_grant",
    "interaction_required",
    "consent_required",
    "login_required",
    "unauthorized_client",
    "invalid_client",
  ].includes(code);
}
