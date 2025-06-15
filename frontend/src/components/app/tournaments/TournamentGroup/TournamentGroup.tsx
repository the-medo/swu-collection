import React from 'react';
import { TournamentGroupWithMeta } from '../../../../../../types/TournamentGroup';
import TournamentGroupTournament from './TournamentGroupTournament';
import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';

interface TournamentGroupProps {
  group: TournamentGroupWithMeta;
}

const TournamentGroup: React.FC<TournamentGroupProps> = ({ group }) => {
  return (
    <div className="bg-accent p-4 rounded-md mb-4">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-xl font-semibold">{group.group.name}</h3>
        <Button asChild size="sm">
          <Link
            to="/meta"
            search={{ maTournamentGroupId: group.group.id, page: 'meta' }}
            className="ml-2"
          >
            View Meta Analysis
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
