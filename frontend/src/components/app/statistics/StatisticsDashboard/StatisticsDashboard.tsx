import * as React from 'react';
import { useGetGameResults } from '@/api/game-results/useGetGameResults.ts';
import { useSession } from '@/lib/auth-client.ts';

interface StatisticsDashboardProps {
  scopeId?: string;
}

const StatisticsDashboard: React.FC<StatisticsDashboardProps> = ({ scopeId }) => {
  const session = useSession();

  useGetGameResults({
    enabled: !!session.data,
    userId: session.data?.user.id,
  });

  return <div>Statistics Dashboard {scopeId}</div>;
};

export default StatisticsDashboard;
