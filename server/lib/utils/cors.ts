export const normalizeOrigin = (origin?: string | null) => {
  if (!origin) return null;

  try {
    return new URL(origin).origin;
  } catch {
    return origin.replace(/\/$/, '');
  }
};

const makeOriginSet = (origins: Array<string | undefined>) =>
  new Set(origins.map(normalizeOrigin).filter((origin): origin is string => Boolean(origin)));

const appCorsOrigins = makeOriginSet([
  process.env.BETTER_AUTH_URL,
  ...process.env.ALLOWED_ORIGINS!.split(','),
]);

export const isAllowedApiOrigin = (path: string, origin?: string | null) => {
  const normalizedOrigin = normalizeOrigin(origin);
  return Boolean(normalizedOrigin && appCorsOrigins.has(normalizedOrigin));
};
