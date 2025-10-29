import * as React from 'react';
import {
  NavigationMenuItem,
  NavigationMenuTrigger,
  NavigationMenuContent,
  NavigationMenuLink,
} from '@/components/ui/navigation-menu.tsx';
import { DollarSign, Check } from 'lucide-react';
import { useGetUserSetting } from '@/api/user/useGetUserSetting.ts';
import { useSetUserSetting } from '@/api/user/useSetUserSetting.ts';
import { cardPriceSourceInfo } from '../../../../../../../../types/CardPrices.ts';
import { cn } from '@/lib/utils';

const PriceSourceSelector: React.FC = () => {
  const { data: showPrices } = useGetUserSetting('deckPrices');
  const { mutate: setShowPrices } = useSetUserSetting('deckPrices');

  const { data: priceSource } = useGetUserSetting('priceSourceType');
  const { mutate: setPriceSource } = useSetUserSetting('priceSourceType');

  const displayOptions = [
    { id: true, label: 'Show' },
    { id: false, label: 'Hide' },
  ];

  const priceSourceOptions = Object.values(cardPriceSourceInfo);

  return (
    <NavigationMenuItem>
      <NavigationMenuTrigger className="w-[220px] justify-start border">
        <DollarSign className="h-4 w-4 mr-2" />
        <span className="text-xs">Prices: </span>
        {showPrices ? (priceSource ? cardPriceSourceInfo[priceSource].name : 'Unknown') : 'None'}
      </NavigationMenuTrigger>
      <NavigationMenuContent>
        <div className="p-2 grid grid-cols-1 gap-4 w-[300px]">
          {/* First section: Show/Hide options */}
          <div className="col-span-1 grid grid-cols-1 gap-1">
            {/*<div className="text-sm font-medium mb-1">Display</div>*/}
            {displayOptions.map(option => (
              <li
                key={String(option.id)}
                onClick={() => setShowPrices(option.id)}
                className={cn(
                  'rounded hover:bg-accent hover:text-accent-foreground p-2 cursor-pointer',
                  option.id === showPrices && 'bg-accent/50 text-accent-foreground',
                )}
              >
                <NavigationMenuLink asChild>
                  <div className="text-sm leading-none font-medium flex items-center justify-between">
                    {option.label}
                    {option.id === showPrices && <Check className="h-4 w-4 ml-2" />}
                  </div>
                </NavigationMenuLink>
              </li>
            ))}
          </div>

          <div className="col-span-1 grid grid-cols-1 gap-1">
            {/*<div className="text-sm font-medium mb-1">Price Source</div>*/}
            <ul className="grid gap-2">
              {priceSourceOptions.map(option => (
                <li
                  key={option.id}
                  onClick={() => (option.enabled ? setPriceSource(option.id) : undefined)}
                  className={cn(
                    'rounded hover:bg-accent hover:text-accent-foreground p-2 cursor-pointer',
                    option.id === priceSource && 'bg-accent/50 text-accent-foreground',
                    !option.enabled && 'opacity-50 cursor-not-allowed',
                  )}
                >
                  <NavigationMenuLink asChild>
                    <div className="flex items-center gap-3">
                      <div className="shrink-0 w-10 h-10 relative bg-white/90 p-1">
                        <img
                          src={option.logo}
                          alt={option.name}
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <div>
                        <div className="font-medium">{option.name}</div>
                        <div className="text-muted-foreground text-sm">{option.description}</div>
                      </div>
                      {option.id === priceSource && <Check className="h-4 w-4 ml-auto" />}
                    </div>
                  </NavigationMenuLink>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </NavigationMenuContent>
    </NavigationMenuItem>
  );
};

export default PriceSourceSelector;
