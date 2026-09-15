export type AppRole = 'user' | 'admin' | 'organizer' | 'moderator' | 'crossfire';

/** Better Auth stores multiple roles as a comma-separated string. */
export function userRoles(value: string | null | undefined): string[] {
  return [
    ...new Set(
      (value ?? '')
        .split(',')
        .map(role => role.trim())
        .filter(Boolean),
    ),
  ];
}
export function hasRole(value: string | null | undefined, role: AppRole): boolean {
  return userRoles(value).includes(role);
}
export const hasCrossfireAccess = (value: string | null | undefined) => hasRole(value, 'crossfire');

/** Preserve other roles, including roles added by a future application version. */
export function withCrossfireAccess(value: string | null | undefined, enabled: boolean): string {
  const current = userRoles(value);
  const roles = current.length ? current : ['user'];
  return (
    (enabled
      ? [...new Set([...roles, 'crossfire'])]
      : roles.filter(role => role !== 'crossfire')
    ).join(',') || 'user'
  );
}
