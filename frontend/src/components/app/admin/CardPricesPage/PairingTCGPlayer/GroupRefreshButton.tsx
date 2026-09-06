import React from 'react';
import { Button } from '@/components/ui/button.tsx';
import { useGetTcgPlayerGroups } from '@/api/card-prices';

const GroupRefreshButton: React.FC = () => {
  const [status, setStatus] = React.useState<null | 'ok' | 'error'>(null);
  const { refetch, isFetching } = useGetTcgPlayerGroups();

  const handleRefresh = async () => {
    try {
      setStatus(null);
      const result = await refetch();
      if (result.error) throw result.error;
      setStatus('ok');
    } catch (e) {
      console.error('Failed to refresh TCGplayer groups', e);
      setStatus('error');
    } finally {
      // Clear status after a short delay
      setTimeout(() => setStatus(null), 2500);
    }
  };

  const label = isFetching
    ? 'Refreshing...'
    : status === 'ok'
      ? 'Groups saved'
      : status === 'error'
        ? 'Retry'
        : 'Refresh groups';

  return (
    <Button size="sm" variant="outline" onClick={handleRefresh} disabled={isFetching}>
      {label}
    </Button>
  );
};

export default GroupRefreshButton;
