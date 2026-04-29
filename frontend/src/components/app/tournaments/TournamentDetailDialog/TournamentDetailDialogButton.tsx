import * as React from 'react';
import { useNavigate } from '@tanstack/react-router';
import { PieChart } from 'lucide-react';
import { Button } from '@/components/ui/button.tsx';

type TournamentDetailDialogButtonProps = {
  tournamentId: string;
};

const TournamentDetailDialogButton: React.FC<TournamentDetailDialogButtonProps> = ({
  tournamentId,
}) => {
  const navigate = useNavigate();

  return (
    <Button
      type="button"
      variant="outline"
      size="xs"
      className="h-7 justify-start px-2 text-xs font-medium uppercase text-muted-foreground"
      onClick={() =>
        navigate({
          to: '.',
          search: prev => ({
            ...prev,
            dialogTournamentId: tournamentId,
            page: 'meta',
          }),
        })
      }
    >
      <PieChart />
      Detail
    </Button>
  );
};

export default TournamentDetailDialogButton;
