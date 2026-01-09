import * as React from 'react';
import SectionDropdownMenu from '@/components/app/daily-snapshots/sections/components/SectionDropdownMenu';
import { Link } from '@tanstack/react-router';
import {
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

export interface MostPlayedCardsDropdownMenuProps {
  className?: string;
  tournamentGroupId: string;
}

const MostPlayedCardsDropdownMenu: React.FC<MostPlayedCardsDropdownMenuProps> = ({
  className,
  tournamentGroupId,
}) => {
  return (
    <SectionDropdownMenu className={className}>
      <DropdownMenuLabel>More card stats</DropdownMenuLabel>
      <DropdownMenuSeparator />
      <DropdownMenuItem asChild>
        <Link
          to="/meta"
          search={prev => ({
            ...prev,
            maTournamentGroupId: tournamentGroupId,
            page: 'card-stats',
            csPage: 'all',
          })}
        >
          All Cards
        </Link>
      </DropdownMenuItem>
      <DropdownMenuItem asChild>
        <Link
          to="/meta"
          search={prev => ({
            ...prev,
            maTournamentGroupId: tournamentGroupId,
            page: 'card-stats',
            csPage: 'aspect',
          })}
        >
          by Aspect
        </Link>
      </DropdownMenuItem>
      <DropdownMenuItem asChild>
        <Link
          to="/meta"
          search={prev => ({
            ...prev,
            maTournamentGroupId: tournamentGroupId,
            page: 'card-stats',
            csPage: 'leader',
          })}
        >
          by Leader
        </Link>
      </DropdownMenuItem>
      <DropdownMenuItem asChild>
        <Link
          to="/meta"
          search={prev => ({
            ...prev,
            maTournamentGroupId: tournamentGroupId,
            page: 'card-stats',
            csPage: 'leader-base',
          })}
        >
          by Leader/Base
        </Link>
      </DropdownMenuItem>
      <DropdownMenuItem asChild>
        <Link
          to="/meta"
          search={prev => ({
            ...prev,
            maTournamentGroupId: tournamentGroupId,
            page: 'card-stats',
            csPage: 'matchup',
          })}
        >
          Matchup card stats
        </Link>
      </DropdownMenuItem>
    </SectionDropdownMenu>
  );
};

export default MostPlayedCardsDropdownMenu;
