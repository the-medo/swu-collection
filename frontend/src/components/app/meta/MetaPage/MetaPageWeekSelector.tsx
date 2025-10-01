import * as React from 'react';
import { useNavigate } from '@tanstack/react-router';
import WeekSelector from '@/components/app/tournaments/pages/TournamentsPlanetaryQualifiers/WeekSelector.tsx';
import { usePQTournamentGroups } from '@/components/app/tournaments/pages/TournamentsPlanetaryQualifiers/hooks/usePQTournamentGroups';
import { useProcessedTournamentGroups } from '@/components/app/tournaments/pages/TournamentsPlanetaryQualifiers/hooks/useProcessedTournamentGroups';
import { Route } from '@/routes/meta';
import { Skeleton } from '@/components/ui/skeleton.tsx';

interface MetaPageWeekSelectorProps {
  metaId: number | undefined;
  selectedTournamentGroupId: string | undefined;
}

const MetaPageWeekSelector: React.FC<MetaPageWeekSelectorProps> = ({
  metaId,
  selectedTournamentGroupId,
}) => {
  const navigate = useNavigate({ from: Route.fullPath });

  const { isLoading, pqWeekGroups } = usePQTournamentGroups(metaId);
  const processedTournamentGroups = useProcessedTournamentGroups(pqWeekGroups);

  const handleChange = (value: string) => {
    navigate({
      search: prev => ({
        ...prev,
        maTournamentGroupId: value,
      }),
    });
  };

  if (isLoading) {
    return <Skeleton className="h-12 w-full rounded-lg" />;
  }

  if (!processedTournamentGroups.length) {
    return null;
  }

  return (
    <WeekSelector
      value={selectedTournamentGroupId}
      onValueChange={handleChange}
      processedTournamentGroups={processedTournamentGroups}
      showSpecialOptions={false}
    />
  );
};

export default MetaPageWeekSelector;
