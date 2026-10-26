// Keep auth redirects within the application and away from token-bearing pages.
export function safeAuthReturnTo(value: unknown) {
  if (
    typeof value !== 'string' ||
    !value.startsWith('/') ||
    value.startsWith('//') ||
    /[\\\u0000-\u0020]/.test(value)
  )
    return '/';
  try {
    const url = new URL(value, 'https://swubase.invalid');
    if (
      url.origin !== 'https://swubase.invalid' ||
      /^\/auth(?:\/|$)/.test(url.pathname) ||
      /^\/api(?:\/|$)/.test(url.pathname)
    )
      return '/';
    return url.pathname + url.search + url.hash;
  } catch {
    return '/';
  }
}

export const authPasswordMinLength = 12;
export const authPasswordMaxLength = 128;

export function isSensitiveAuthUrl(value?: string) {
  return !!value && /\/(?:api\/)?auth(?:[/?#]|$)/.test(value);
}
