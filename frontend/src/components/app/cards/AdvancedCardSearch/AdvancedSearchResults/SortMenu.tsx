import * as React from 'react';
import {
  NavigationMenuItem,
  NavigationMenuTrigger,
  NavigationMenuContent,
  NavigationMenuLink,
} from '@/components/ui/navigation-menu.tsx';
import { ArrowDownAZ, ArrowUpAZ, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SortField } from '@/components/app/cards/AdvancedCardSearch/AdvancedSearchResults/useSearchCardTableColumns.tsx';

export interface SortMenuProps {
  sortField: SortField;
  sortOrder: 'asc' | 'desc';
  onChange: (field: SortField) => void;
}

const SortMenu: React.FC<SortMenuProps> = ({ sortField, sortOrder, onChange }) => {
  const options: { id: SortField; label: string }[] = [
    { id: 'name', label: 'Name' },
    { id: 'type', label: 'Type' },
    { id: 'cost', label: 'Cost' },
    { id: 'rarity', label: 'Rarity' },
    { id: 'cardNumber', label: 'Number' },
  ];

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return null;
    return sortOrder === 'asc' ? (
      <ArrowDownAZ className="h-4 w-4" />
    ) : (
      <ArrowUpAZ className="h-4 w-4" />
    );
  };

  const currentLabel = options.find(o => o.id === sortField)?.label ?? 'Default';

  return (
    <NavigationMenuItem>
      <NavigationMenuTrigger className="w-[150px] justify-start border">
        {getSortIcon(sortField)}
        <span className="text-xs">Sort: </span>
        {currentLabel}
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
                  option.id === sortField && 'bg-accent/50 text-accent-foreground',
                )}
              >
                <NavigationMenuLink asChild>
                  <div className="text-sm leading-none font-medium flex items-center justify-between">
                    {option.label}
                    {option.id === sortField ? (
                      <div className="flex items-center gap-1">
                        <Check className="h-4 w-4 ml-2" />
                        {getSortIcon(option.id)}
                      </div>
                    ) : null}
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

export default SortMenu;
