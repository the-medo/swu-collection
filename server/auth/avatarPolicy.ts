import { APIError } from 'better-auth/api';

export function assertCardAvatarUpdate(path: string | undefined, body: unknown) {
  if (path === '/update-user' && body && Object.prototype.hasOwnProperty.call(body, 'image')) {
    throw new APIError('BAD_REQUEST', {
      message: 'Choose card artwork in Profile settings to change your avatar.',
    });
  }
}
