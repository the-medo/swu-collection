import * as React from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SectionDropdownMenuProps {
  children?: React.ReactNode;
  className?: string;
  // Pass-through props to control content alignment if needed by consumers
  align?: 'start' | 'center' | 'end';
  sideOffset?: number;
}

const SectionDropdownMenu: React.FC<SectionDropdownMenuProps> = ({
  children,
  className,
  align = 'end',
  sideOffset = 4,
}) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="xs"
          className={cn(
            'inline-flex items-center justify-center rounded p-2 hover:bg-muted/60 mb-2',
            className,
          )}
          aria-label="Section options"
        >
          More
          <ChevronDown className="size-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} sideOffset={sideOffset}>
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default SectionDropdownMenu;
