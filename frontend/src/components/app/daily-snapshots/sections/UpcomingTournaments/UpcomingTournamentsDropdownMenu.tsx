import * as React from 'react';
import SectionDropdownMenu from '@/components/app/daily-snapshots/sections/components/SectionDropdownMenu';
import { Link } from '@tanstack/react-router';
import { DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';

export interface UpcomingTournamentsDropdownMenuProps {
  className?: string;
}

const UpcomingTournamentsDropdownMenu: React.FC<UpcomingTournamentsDropdownMenuProps> = ({ className }) => {
  return (
    <SectionDropdownMenu className={className}>
      <DropdownMenuLabel>Browse tournaments</DropdownMenuLabel>
      <DropdownMenuSeparator />
      <DropdownMenuItem asChild>
        <Link to="/tournaments/featured">Featured tournaments</Link>
      </DropdownMenuItem>
      <DropdownMenuItem asChild>
        <Link to="/tournaments/all">All tournaments</Link>
      </DropdownMenuItem>
      <DropdownMenuItem asChild>
        <Link to="/tournaments/planetary-qualifiers">PQ - recent week</Link>
      </DropdownMenuItem>
      <DropdownMenuItem asChild>
        <Link to="/tournaments/planetary-qualifiers" search={{ weekId: 'all' }}>PQ - All weeks</Link>
      </DropdownMenuItem>
    </SectionDropdownMenu>
  );
};

export default UpcomingTournamentsDropdownMenu;
