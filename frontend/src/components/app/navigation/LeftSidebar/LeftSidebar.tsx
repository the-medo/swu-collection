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
  useSidebar,
} from '@/components/ui/sidebar.tsx';
import { Link } from '@tanstack/react-router';
import SignIn from '@/components/app/auth/SignIn.tsx';
import { useUser } from '@/hooks/useUser.ts';
import NewCollectionDialog from '@/components/app/dialogs/NewCollectionDialog.tsx';
import LogoLightTheme from '../../../../assets/logo-light-theme.svg';
import LogoDarkTheme from '../../../../assets/logo-dark-theme.svg';
import { useTheme } from '@/components/theme-provider.tsx';
import NewDeckDialog from '@/components/app/dialogs/NewDeckDialog/NewDeckDialog.tsx';
import CardSearchCommand from '@/components/app/global/CardSearchCommand/CardSearchCommand.tsx';
import SocialLinks from '@/components/app/navigation/LeftSidebar/SocialLinks.tsx';
import { cn } from '@/lib/utils.ts';

const groups = [
  {
    title: 'Decks',
    actionLabel: 'Add Deck',
    action: () => {},
    icon: BookCheck,
    sidebarGroupAction: (
      <NewDeckDialog
        trigger={
          <SidebarGroupAction title="Add Collection">
            <Plus /> <span className="sr-only">Add Collection</span>
          </SidebarGroupAction>
        }
      />
    ),
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
  const { theme } = useTheme();
  const { open, isMobile, setOpenMobile } = useSidebar();

  return (
    <Sidebar collapsible="icon" variant="sidebar">
      <SidebarHeader>
        <Link to="/" className={cn({ 'self-center': !isMobile, 'self-start pl-4': isMobile })}>
          {isMobile ? (
            <div className="w-full flex justify-between gap-4">
              <img
                src={theme === 'light' ? LogoLightTheme : LogoDarkTheme}
                className="w-8 h-8"
                alt="Logo"
              />
              <h4>SWU Base</h4>
            </div>
          ) : (
            <img src={theme === 'light' ? LogoLightTheme : LogoDarkTheme} alt="Logo" />
          )}
        </Link>
      </SidebarHeader>
      <SidebarSeparator />
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            {open ? (
              <CardSearchCommand id="card-search-left-sidebar" />
            ) : (
              <SidebarMenuButton asChild>
                <Link to="/cards/search" className="[&.active]:font-bold">
                  <Search />
                  <span>Search</span>
                </Link>
              </SidebarMenuButton>
            )}
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
                        <Link
                          to={i.url}
                          className="[&.active]:font-bold"
                          onClick={() => {
                            setOpenMobile(false);
                          }}
                        >
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
      <SocialLinks />
      <SidebarSeparator />
      <SidebarFooter>
        <SignIn isLeftSidebar />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
