import { useEffect } from 'react';
import { useSession } from '@/lib/auth-client';
import { fetchAndSaveUserSettings } from '@/lib/userSettings';

export function UserSettingsLoader() {
  const { data: session, isPending } = useSession();

  useEffect(() => {
    if (isPending || !session) return;
    if (sessionStorage.getItem('needsSettingsSync') !== '1') return;

    fetchAndSaveUserSettings()
      .catch(console.error)
      .finally(() => {
        sessionStorage.removeItem('needsSettingsSync');
      });
  }, [session, isPending]);

  return null;
}
