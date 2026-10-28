export function emailAuthError(error: { code?: string; status?: number } | null) {
  if (!error) return 'We couldn’t connect. Check your connection and try again.';
  if (error.status === 429) return 'Too many attempts. Please wait a minute and try again.';
  switch (error.code) {
    case 'INVALID_EMAIL_OR_PASSWORD':
      return 'Email or password is incorrect. You can also use Google or GitHub, or reset your password.';
    case 'EMAIL_NOT_VERIFIED':
      return 'Verify your email before signing in.';
    case 'PASSWORD_TOO_SHORT':
      return 'Use at least 12 characters for your password.';
    case 'PASSWORD_TOO_LONG':
      return 'Use no more than 128 characters for your password.';
    case 'INVALID_TOKEN':
    case 'TOKEN_EXPIRED':
      return 'This link has expired or has already been used. Please request a new one.';
    case 'BANNED_USER':
      return 'This account is suspended or banned. You cannot sign in.';
    case 'INVALID_PASSWORD':
      return 'Your current password is incorrect.';
    default:
      return 'We couldn’t complete that request. Please try again.';
  }
}
