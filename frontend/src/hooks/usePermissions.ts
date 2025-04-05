import { useCallback } from 'react';
import { authClient } from '@/lib/auth-client.ts';
import { useUser } from '@/hooks/useUser.ts';

export function usePermissions() {
  const user = useUser();

  return useCallback(
    (section: string, permission: string) => {
      if (!user) return false;
      return ((user.role ?? '').split(',') as ('admin' | 'organizer' | 'moderator')[]).some(r =>
        authClient.admin.checkRolePermission({
          permission: {
            [section]: [permission],
          },
          role: r,
        }),
      );
    },
    [user?.role],
  );
}
