import {
  Plus,
  TrophyIcon,
  BookOpenCheck,
  BookOpen,
  ScrollText,
  BookCheck,
  Book,
  Search,
} from 'lucide-react';

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from '@/components/ui/sidebar';
import { Link } from '@tanstack/react-router';
import { Input } from '@/components/ui/input.tsx';

const groups = [
  {
    title: 'Decks',
    actionLabel: 'Add Deck',
    action: () => {},
    icon: BookCheck,
    items: [
      {
        title: 'Your decks',
        url: '/decks/your',
        icon: BookCheck,
      },
      {
        title: 'Public decks',
        url: '/decks/public',
        icon: Book,
      },
      {
        title: 'Tournament decks',
        url: '/decks/tournament',
        icon: TrophyIcon,
      },
    ],
  },
  {
    title: 'Collections',
    actionLabel: 'Add Collection',
    action: () => {},
    icon: BookOpenCheck,
    items: [
      {
        title: 'Your collections',
        url: '/collections/your',
        icon: BookOpenCheck,
      },
      {
        title: 'Public collections',
        url: '/collections/public',
        icon: BookOpen,
      },
    ],
  },
  {
    title: 'Wantlists',
    actionLabel: 'Add Wantlist',
    action: () => {},
    icon: ScrollText,
    items: [
      {
        title: 'Your wantlists',
        url: '/wantlists/your',
        icon: ScrollText,
      },
      {
        title: 'Public wantlists',
        url: '/wantlists/public',
        icon: ScrollText,
      },
    ],
  },
];

export function LeftSidebar() {
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <h1 className="font-bold text-2xl">SWU Base</h1>
      </SidebarHeader>
      <SidebarSeparator />
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <Input icon={Search} placeholder="Search" />
          </SidebarGroupContent>
        </SidebarGroup>
        {groups.map(g => (
          <SidebarGroup>
            <SidebarGroupLabel>{g.title}</SidebarGroupLabel>
            <SidebarGroupAction title={g.actionLabel}>
              <Plus /> <span className="sr-only">{g.actionLabel}</span>
            </SidebarGroupAction>
            <SidebarGroupContent>
              <SidebarMenu>
                {g.items.map(i => (
                  <SidebarMenuItem key={i.title}>
                    <SidebarMenuButton asChild>
                      <Link to={i.url} className="[&.active]:font-bold">
                        <i.icon />
                        <span>{i.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarSeparator />
      <SidebarFooter>User info</SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
