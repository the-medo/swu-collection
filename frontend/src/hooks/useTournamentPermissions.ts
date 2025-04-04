import { useState, useEffect } from 'react';
import { authClient } from '@/lib/auth-client.ts';

export function useTournamentPermissions() {
  const [canCreate, setCanCreate] = useState<boolean | null>(null);
  const [canUpdate, setCanUpdate] = useState<boolean | null>(null);
  const [canDelete, setCanDelete] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkPermissions() {
      setLoading(true);
      try {
        // Check for tournament creation permission
        const createPerm = await authClient.admin.hasPermission({
          permission: {
            tournament: ['create'],
          },
        });

        // Check for tournament update permission
        const updatePerm = await authClient.admin.hasPermission({
          permission: {
            tournament: ['update'],
          },
        });

        // Check for tournament deletion permission
        const deletePerm = await authClient.admin.hasPermission({
          permission: {
            tournament: ['delete'],
          },
        });

        setCanCreate(createPerm.data?.success ?? null);
        setCanUpdate(updatePerm.data?.success ?? null);
        setCanDelete(deletePerm.data?.success ?? null);
      } catch (error) {
        // If there's an error, assume no permissions
        setCanCreate(false);
        setCanUpdate(false);
        setCanDelete(false);
      } finally {
        setLoading(false);
      }
    }

    checkPermissions();
  }, []);

  return {
    canCreate,
    canUpdate,
    canDelete,
    loading,
    hasAnyPermission: !loading && (canCreate || canUpdate || canDelete),
  };
}
