import { hasRole, type AppRole } from '../../../shared/lib/auth/roles';
import { useCallback } from 'react';
import { useUser } from '@/hooks/useUser.ts';

export function useRole() {
  const user = useUser();

  return useCallback(
    (role: AppRole) => {
      if (!user) return false;
      return hasRole(user.role, role);
    },
    [user],
  );
}
