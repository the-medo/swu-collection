import { auth } from '../../auth/auth.ts';

export async function userHasAdminAccess(userId: string) {
  const result = await auth.api.userHasPermission({
    body: {
      userId,
      permission: {
        admin: ['access'],
      },
    },
  });

  return result.success;
}
