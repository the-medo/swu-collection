import * as React from 'react';
import { useGetTournament } from '@/api/tournaments/useGetTournament.ts';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert.tsx';

interface NoTournamentDataProps {
  tournamentId: string;
}

const NoTournamentData: React.FC<NoTournamentDataProps> = ({ tournamentId }) => {
  const { data, isFetching } = useGetTournament(tournamentId);

  if (isFetching || data?.tournament.imported) {
    return null;
  }

  return (
    <Alert variant="warning">
      <AlertCircle className="h-4 w-4 text-yellow-500 stroke-yellow-500" />
      <AlertTitle className="text-sm">Tournament not imported</AlertTitle>
      <AlertDescription className="pt-4">
        Data for this tournament is not imported yet.
      </AlertDescription>
    </Alert>
  );
};

export default NoTournamentData;
