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
} from '@/components/ui/sidebar.tsx';
import { Link } from '@tanstack/react-router';
import { Input } from '@/components/ui/input.tsx';
import SignIn from '@/components/app/auth/SignIn.tsx';
import { useUser } from '@/hooks/useUser.ts';
import NewCollectionDialog from '@/components/app/dialogs/NewCollectionDialog.tsx';

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
        authenticated: true,
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
    action: () => {},
    icon: BookOpenCheck,
    sidebarGroupAction: (
      <NewCollectionDialog
        trigger={
          <SidebarGroupAction title="Add Collection">
            <Plus /> <span className="sr-only">Add Collection</span>
          </SidebarGroupAction>
        }
        wantlist={false}
      />
    ),
    items: [
      {
        title: 'Your collections',
        url: '/collections/your',
        icon: BookOpenCheck,
        authenticated: true,
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
    action: () => {},
    icon: ScrollText,
    sidebarGroupAction: (
      <NewCollectionDialog
        trigger={
          <SidebarGroupAction title="Add Wantlist">
            <Plus /> <span className="sr-only">Add Wantlist</span>
          </SidebarGroupAction>
        }
        wantlist={true}
      />
    ),
    items: [
      {
        title: 'Your wantlists',
        url: '/wantlists/your',
        icon: ScrollText,
        authenticated: true,
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
  const user = useUser();

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
          <SidebarGroup key={g.title}>
            <SidebarGroupLabel>{g.title}</SidebarGroupLabel>
            {g.sidebarGroupAction ?? null}
            <SidebarGroupContent>
              <SidebarMenu>
                {g.items.map(i =>
                  !i.authenticated || (i.authenticated && user) ? (
                    <SidebarMenuItem key={i.title}>
                      <SidebarMenuButton asChild>
                        <Link to={i.url} className="[&.active]:font-bold">
                          <i.icon />
                          <span>{i.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ) : null,
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarSeparator />
      <SidebarFooter>
        <SignIn />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
