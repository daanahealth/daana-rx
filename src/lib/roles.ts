// Role helpers shared by the nav and the per-page permission gates.
//
// Mirrors READ_ONLY_ROLES in the backend's inventory auth middleware. The
// backend is the enforcement point (these roles get a 403 on any stock
// mutation); this module exists so the UI doesn't offer actions that would
// only fail server-side.

/** Roles that may browse inventory and raise medication requests, nothing more. */
export const READ_ONLY_ROLES = ['provider'] as const;

export function isReadOnlyRole(role: string | null | undefined): boolean {
  return !!role && (READ_ONLY_ROLES as readonly string[]).includes(role);
}

/** Can this role check in, edit, or remove stock? */
export function canModifyStock(role: string | null | undefined): boolean {
  return !isReadOnlyRole(role);
}

/** Superadmin: the only role that manages locations, users, the classification guide. */
export function isSuperadmin(role: string | null | undefined): boolean {
  return role === 'superadmin';
}

/** Can this role open the superadmin sections of Settings? (Mirrors the nav gate.) */
export function canManageSettings(role: string | null | undefined): boolean {
  return isSuperadmin(role);
}
