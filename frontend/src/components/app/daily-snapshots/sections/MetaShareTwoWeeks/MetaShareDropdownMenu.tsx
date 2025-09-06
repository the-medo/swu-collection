import * as React from 'react';
import SectionDropdownMenu from '@/components/app/daily-snapshots/sections/components/SectionDropdownMenu';
import { Link } from '@tanstack/react-router';
import {
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

export interface MetaShareDropdownMenuProps {
  tournamentGroupId?: string | null;
  className?: string;
}

const MetaShareDropdownMenu: React.FC<MetaShareDropdownMenuProps> = ({
  tournamentGroupId,
  className,
}) => {
  return (
    <SectionDropdownMenu className={className}>
      {tournamentGroupId ? (
        <>
          <DropdownMenuLabel>More details</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link
              to="/meta"
              search={prev => ({
                ...prev,
                maTournamentGroupId: tournamentGroupId,
                page: 'meta',
              })}
            >
              Meta
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link
              to="/meta"
              search={prev => ({
                ...prev,
                maTournamentGroupId: tournamentGroupId,
                page: 'matchups',
              })}
            >
              Matchups
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link
              to="/meta"
              search={prev => ({
                ...prev,
                maTournamentGroupId: tournamentGroupId,
                page: 'decks',
              })}
            >
              Decks
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link
              to="/meta"
              search={prev => ({
                ...prev,
                maTournamentGroupId: tournamentGroupId,
                page: 'card-stats',
              })}
            >
              Card stats
            </Link>
          </DropdownMenuItem>
        </>
      ) : (
        <DropdownMenuItem disabled>No tournament group</DropdownMenuItem>
      )}
    </SectionDropdownMenu>
  );
};

export default MetaShareDropdownMenu;
