import * as React from 'react';
import {
  NavigationMenuItem,
  NavigationMenuTrigger,
  NavigationMenuContent,
  NavigationMenuLink,
} from '@/components/ui/navigation-menu.tsx';
import { LayoutGrid, LayoutList, FileText } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton.tsx';
import { useGetUserSetting } from '@/api/user/useGetUserSetting.ts';
import { useSetUserSetting } from '@/api/user/useSetUserSetting.ts';
import { DeckLayout } from '../../../../../../../../types/enums.ts';

const DeckLayoutMenu: React.FC = () => {
  const { data: layout } = useGetUserSetting('deckLayout');
  const { mutate: setLayout } = useSetUserSetting('deckLayout');

  const layoutOptions = [
    { id: DeckLayout.TEXT, label: 'Text', icon: <FileText className="h-4 w-4 mr-2" /> },
    {
      id: DeckLayout.TEXT_CONDENSED,
      label: 'Text condensed',
      icon: <FileText className="h-4 w-4 mr-2" />,
    },
    { id: DeckLayout.VISUAL_GRID, label: 'Grid', icon: <LayoutGrid className="h-4 w-4 mr-2" /> },
    {
      id: DeckLayout.VISUAL_GRID_OVERLAP,
      label: 'Grid - Overlap',
      icon: <LayoutGrid className="h-4 w-4 mr-2" />,
    },
    {
      id: DeckLayout.VISUAL_STACKS,
      label: 'Stacks',
      icon: <LayoutList className="h-4 w-4 mr-2" />,
    },
    {
      id: DeckLayout.VISUAL_STACKS_SPLIT,
      label: 'Stacks - Split',
      icon: <LayoutList className="h-4 w-4 mr-2" />,
    },
  ];

  return (
    <NavigationMenuItem>
      <NavigationMenuTrigger className="w-[220px] justify-start border">
        <LayoutGrid className="h-4 w-4 mr-0" />
        <span className="text-xs">Layout: </span>
        {layoutOptions.find(option => option.id === layout)?.label || 'Default'}
      </NavigationMenuTrigger>
      <NavigationMenuContent>
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 w-[220px] md:w-[440px]">
          <div className="col-span-1 hidden md:block">
            <Skeleton className="w-full h-[200px] rounded-md" />
          </div>
          <div className="col-span-1 grid grid-cols-1 gap-1">
            {layoutOptions.map(option => (
              <li
                key={option.id}
                onClick={() => setLayout(option.id)}
                className="rounded hover:bg-accent hover:text-accent-foreground p-2 cursor-pointer"
              >
                <NavigationMenuLink asChild>
                  <div className="text-sm leading-none font-medium">{option.label}</div>
                </NavigationMenuLink>
              </li>
            ))}
          </div>
        </div>
      </NavigationMenuContent>
    </NavigationMenuItem>
  );
};

export default DeckLayoutMenu;
