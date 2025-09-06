import * as React from 'react';
import SectionDropdownMenu from '@/components/app/daily-snapshots/sections/components/SectionDropdownMenu';
import { Link } from '@tanstack/react-router';
import { DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';

// Fixed maTournamentGroupId provided by the request
const FIXED_TG_ID = 'fb440739-8002-4a7d-8d7e-113758997f3f';

export interface MostPlayedCardsDropdownMenuProps {
  className?: string;
}

const MostPlayedCardsDropdownMenu: React.FC<MostPlayedCardsDropdownMenuProps> = ({ className }) => {
  return (
    <SectionDropdownMenu className={className}>
      <DropdownMenuLabel>More card stats</DropdownMenuLabel>
      <DropdownMenuSeparator />
      <DropdownMenuItem asChild>
        <Link
          to="/meta"
          search={prev => ({
            ...prev,
            maTournamentGroupId: FIXED_TG_ID,
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
            maTournamentGroupId: FIXED_TG_ID,
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
            maTournamentGroupId: FIXED_TG_ID,
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
            maTournamentGroupId: FIXED_TG_ID,
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
            maTournamentGroupId: FIXED_TG_ID,
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
