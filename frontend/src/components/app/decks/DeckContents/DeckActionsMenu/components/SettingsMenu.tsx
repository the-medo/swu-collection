import * as React from 'react';
import {
  NavigationMenuItem,
  NavigationMenuTrigger,
  NavigationMenuContent,
  NavigationMenuLink,
} from '@/components/ui/navigation-menu.tsx';
import { Settings, Check, X } from 'lucide-react';
import { useGetUserSetting } from '@/api/user/useGetUserSetting.ts';
import { useSetUserSetting } from '@/api/user/useSetUserSetting.ts';
import { cn } from '@/lib/utils';
import { useUser } from '@/hooks/useUser.ts';

const SettingsMenu: React.FC = () => {
  const user = useUser();
  const { data: collectionInfoInDecks } = useGetUserSetting('collectionInfoInDecks');
  const { mutate: setCollectionInfoInDecks } = useSetUserSetting('collectionInfoInDecks');

  const toggle = () => (user ? setCollectionInfoInDecks(!collectionInfoInDecks) : void 0);

  return (
    <NavigationMenuItem>
      <NavigationMenuTrigger className="justify-start border">
        <Settings className="h-4 w-4 mr-0" />
      </NavigationMenuTrigger>
      <NavigationMenuContent>
        <div className="p-2 grid grid-cols-1 gap-4 w-[260px]">
          <div className="col-span-1 grid grid-cols-1 gap-1">
            <li
              onClick={toggle}
              className={cn(
                'rounded hover:bg-accent hover:text-accent-foreground p-2 cursor-pointer',
                collectionInfoInDecks && 'bg-accent/50 text-accent-foreground',
                !user && 'opacity-50 cursor-not-allowed',
              )}
            >
              <NavigationMenuLink asChild>
                <div className="text-sm leading-none font-medium flex items-center justify-between">
                  Display collection info
                  {collectionInfoInDecks ? (
                    <Check className="h-4 w-4 ml-2" />
                  ) : (
                    <X className="h-4 w-4 ml-2" />
                  )}
                </div>
              </NavigationMenuLink>
            </li>
          </div>
        </div>
      </NavigationMenuContent>
    </NavigationMenuItem>
  );
};

export default SettingsMenu;
