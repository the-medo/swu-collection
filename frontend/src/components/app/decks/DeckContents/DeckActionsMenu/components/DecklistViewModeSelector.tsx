import * as React from 'react';
import {
  NavigationMenuItem,
  NavigationMenuTrigger,
  NavigationMenuContent,
  NavigationMenuLink,
} from '@/components/ui/navigation-menu.tsx';
import { BarChart, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUser } from '@/hooks/useUser.ts';

interface DecklistViewModeSelectorProps {
  value: string;
  onValueChange?: (value: string) => void;
}

// Looks like GroupByMenu using NavigationMenu components,
// but offers the view options from DecklistChartsTabs.
// For logged-in users: always three options (Decklist, Charts, Collections).
// For guests: only Decklist and Charts. "Collections" option is shown regardless of the user setting.
const DecklistViewModeSelector: React.FC<DecklistViewModeSelectorProps> = ({
  value,
  onValueChange,
}) => {
  const user = useUser();

  const allOptions = [
    { id: 'decklist', label: 'Decklist' },
    { id: 'charts', label: 'Charts' },
    { id: 'collection', label: 'Collections' },
  ] as const;

  const options = user ? allOptions : allOptions.filter(o => o.id !== 'collection');
  const active = options.find(o => o.id === value) ?? options[0];

  const handleSelect = (id: string) => {
    if (onValueChange) onValueChange(id);
  };

  return (
    <NavigationMenuItem>
      <NavigationMenuTrigger className="w-[140px] justify-start border">
        <BarChart className="h-4 w-4 mr-2" />
        <div className="flex items-center gap-2 text-sm">
          <span>{active.label}</span>
        </div>
      </NavigationMenuTrigger>
      <NavigationMenuContent>
        <div className="p-4 grid grid-cols-1 gap-4 w-[220px]">
          <div className="col-span-1 grid grid-cols-1 gap-1">
            {options.map(option => (
              <li
                key={option.id}
                onClick={() => handleSelect(option.id)}
                className={cn(
                  'rounded hover:bg-accent hover:text-accent-foreground p-2 cursor-pointer',
                  option.id === active.id && 'bg-accent/50 text-accent-foreground',
                )}
              >
                <NavigationMenuLink asChild>
                  <div className="text-sm leading-none font-medium flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {option.label}
                    </div>
                    {option.id === active.id && <Check className="h-4 w-4 ml-2" />}
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

export default DecklistViewModeSelector;
