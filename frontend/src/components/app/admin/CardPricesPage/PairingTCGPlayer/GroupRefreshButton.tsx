import React from 'react';
import { Button } from '@/components/ui/button.tsx';
import {
  TCGCSV_GROUPS_LOCAL_STORAGE_KEY,
  TCGCSV_SWU_ID,
} from '../../../../../../../shared/consts/constants.ts';

const GroupRefreshButton: React.FC = () => {
  const [isLoading, setIsLoading] = React.useState(false);
  const [status, setStatus] = React.useState<null | 'ok' | 'error'>(null);

  const handleRefresh = async () => {
    try {
      setIsLoading(true);
      setStatus(null);

      const url = `https://tcgcsv.com/tcgplayer/${TCGCSV_SWU_ID}/groups`;
      const res = await fetch(url, {
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!res.ok) {
        throw new Error(`Request failed with status ${res.status}`);
      }

      const data = await res.json();
      localStorage.setItem(TCGCSV_GROUPS_LOCAL_STORAGE_KEY, JSON.stringify(data));
      setStatus('ok');
    } catch (e) {
      console.error('Failed to refresh TCGplayer groups', e);
      setStatus('error');
    } finally {
      setIsLoading(false);
      // Clear status after a short delay
      setTimeout(() => setStatus(null), 2500);
    }
  };

  const label = isLoading
    ? 'Refreshing...'
    : status === 'ok'
      ? 'Groups saved'
      : status === 'error'
        ? 'Retry'
        : 'Refresh groups';

  return (
    <Button size="sm" variant="outline" onClick={handleRefresh} disabled={isLoading}>
      {label}
    </Button>
  );
};

export default GroupRefreshButton;
