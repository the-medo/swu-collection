import { APIError } from 'better-auth/api';
import { containsProfanity, profanityMessage } from '../lib/moderation/profanity.ts';

// Database hooks cover self-service, admin and server-side auth writes. OAuth's
// private provider name is separate from SWUBASE's generated public displayName.
export async function validateDisplayName(data: Record<string, unknown>) {
  if (typeof data.displayName === 'string' && containsProfanity(data.displayName)) {
    throw new APIError('BAD_REQUEST', {
      code: 'PROFANITY_NOT_ALLOWED',
      message: profanityMessage('Display name'),
    });
  }
}
