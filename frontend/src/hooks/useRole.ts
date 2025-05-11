import { useCallback } from 'react';
import { useUser } from '@/hooks/useUser.ts';

export function useRole() {
  const user = useUser();

  return useCallback(
    (role: 'admin' | 'organizer' | 'moderator') => {
      if (!user) return false;
      return ((user.role ?? '').split(',') as ('admin' | 'organizer' | 'moderator')[]).includes(role);
    },
    [user?.role],
  );
}