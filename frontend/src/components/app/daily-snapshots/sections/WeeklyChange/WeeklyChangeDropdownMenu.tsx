import * as React from 'react';
import SectionDropdownMenu from '@/components/app/daily-snapshots/sections/components/SectionDropdownMenu';
import { Link } from '@tanstack/react-router';
import { DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';

export interface WeeklyChangeDropdownMenuProps {
  className?: string;
}

const WeeklyChangeDropdownMenu: React.FC<WeeklyChangeDropdownMenuProps> = ({ className }) => {
  return (
    <SectionDropdownMenu className={className}>
      <DropdownMenuLabel>Week-to-week PQ meta</DropdownMenuLabel>
      <DropdownMenuSeparator />
      <DropdownMenuItem asChild>
        <Link to="/tournaments/planetary-qualifiers" search={{ weekId: 'wtw', page: 'champions' }}>
          Champions
        </Link>
      </DropdownMenuItem>
      <DropdownMenuItem asChild>
        <Link to="/tournaments/planetary-qualifiers" search={{ weekId: 'wtw', page: 'top8' }}>
          Top 8
        </Link>
      </DropdownMenuItem>
      <DropdownMenuItem asChild>
        <Link to="/tournaments/planetary-qualifiers" search={{ weekId: 'wtw', page: 'total' }}>
          Total
        </Link>
      </DropdownMenuItem>
    </SectionDropdownMenu>
  );
};

export default WeeklyChangeDropdownMenu;
