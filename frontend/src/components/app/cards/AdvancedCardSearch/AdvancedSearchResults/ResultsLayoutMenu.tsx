import * as React from 'react';
import {
  NavigationMenuItem,
  NavigationMenuTrigger,
  NavigationMenuContent,
  NavigationMenuLink,
} from '@/components/ui/navigation-menu.tsx';
import { Columns, ImageIcon, LayoutGrid, List, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ResultsLayoutMenuProps {
  layout: string;
  onChange: (layout: any) => void;
}

const ResultsLayoutMenu: React.FC<ResultsLayoutMenuProps> = ({ layout, onChange }) => {
  const options: { id: string; label: string; icon: React.ReactNode }[] = [
    { id: 'imageBig', label: 'Large', icon: <ImageIcon className="h-4 w-4" /> },
    { id: 'imageSmall', label: 'Small', icon: <LayoutGrid className="h-4 w-4" /> },
    { id: 'tableImage', label: 'List', icon: <List className="h-4 w-4" /> },
    { id: 'tableSmall', label: 'Table', icon: <Columns className="h-4 w-4" /> },
  ];

  const current = options.find(o => o.id === layout);

  return (
    <NavigationMenuItem>
      <NavigationMenuTrigger className="w-[180px] justify-start border">
        {current?.icon}
        <span className="text-xs ml-1">Layout: </span>
        {current?.label ?? 'Default'}
      </NavigationMenuTrigger>
      <NavigationMenuContent>
        <div className="p-4 grid grid-cols-1 gap-4 w-[160px]">
          <div className="col-span-1 grid grid-cols-1 gap-1">
            {options.map(option => (
              <li
                key={option.id}
                onClick={() => onChange(option.id)}
                className={cn(
                  'rounded hover:bg-accent hover:text-accent-foreground p-2 cursor-pointer',
                  option.id === layout && 'bg-accent/50 text-accent-foreground',
                )}
              >
                <NavigationMenuLink asChild>
                  <div className="text-sm leading-none font-medium flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {option.icon}
                      {option.label}
                    </div>
                    {option.id === layout && <Check className="h-4 w-4 ml-2" />}
                  </div>
                </NavigationMenuLink>
              </li>
            ))}
          </div>
        </div>
      </NavigationMenuContent>
    </NavigationMenuItem>
  );
};

export default ResultsLayoutMenu;
