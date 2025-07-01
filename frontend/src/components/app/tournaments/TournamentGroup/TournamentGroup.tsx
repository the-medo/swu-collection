import React from 'react';
import { TournamentGroupWithMeta } from '../../../../../../types/TournamentGroup';
import TournamentGroupTournament from './TournamentGroupTournament';
import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { PieChart } from 'lucide-react';
import { cn } from '@/lib/utils.ts';

interface TournamentGroupProps {
  group: TournamentGroupWithMeta;
  isMobile?: boolean;
}

const TournamentGroup: React.FC<TournamentGroupProps> = ({ group, isMobile }) => {
  return (
    <div className="bg-accent p-4 rounded-md mb-4">
      <div
        className={cn('flex justify-between items-center mb-2', {
          'flex-col': isMobile,
        })}
      >
        <h3 className="text-xl font-semibold">{group.group.name}</h3>
        <Button asChild variant="outline" size="sm" className="gap-2">
          <Link
            to="/meta"
            search={{ maTournamentGroupId: group.group.id, page: 'meta' }}
            className="ml-2"
          >
            <PieChart className="h-4 w-4" />
            Full meta analysis
          </Link>
        </Button>
      </div>
      {group.group.description && <p className="text-gray-600 mb-4">{group.group.description}</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {group.tournaments.map(tournamentItem => (
          <TournamentGroupTournament
            key={tournamentItem.tournament.id}
            tournamentItem={tournamentItem}
          />
        ))}
      </div>
    </div>
  );
};

export default TournamentGroup;
