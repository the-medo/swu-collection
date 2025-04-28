import {
  Book,
  BookCheck,
  BookOpen,
  BookOpenCheck,
  Hammer,
  NotebookTabs,
  Plus,
  Scale,
  ScrollText,
  Search,
  TrophyIcon,
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
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
  useSidebar,
} from '@/components/ui/sidebar.tsx';
import { Link, useNavigate } from '@tanstack/react-router';
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
import { CollectionType } from '../../../../../../types/enums.ts';
import SidebarComparer from '../../comparer/SidebarComparer/SidebarComparer.tsx';
import { Route } from '@/routes/__root.tsx';
import { Fragment } from 'react';

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
        title: 'Meta analysis',
        url: '/tournaments',
        icon: TrophyIcon,
      },
    ],
  },
  {
    title: 'Lists',
    action: () => {},
    icon: BookOpenCheck,
    sidebarGroupAction: null,
    items: [
      {
        title: 'Your collections',
        url: '/collections/your',
        icon: BookOpenCheck,
        authenticated: true,
        menuAction: (
          <NewCollectionDialog
            trigger={
              <SidebarMenuAction title="Add Collection">
                <Plus /> <span className="sr-only">Add Collection</span>
              </SidebarMenuAction>
            }
            collectionType={CollectionType.COLLECTION}
          />
        ),
      },
      {
        title: 'Your wantlists',
        url: '/wantlists/your',
        icon: ScrollText,
        authenticated: true,
        menuAction: (
          <NewCollectionDialog
            trigger={
              <SidebarMenuAction title="Add Wantlist">
                <Plus /> <span className="sr-only">Add Wantlist</span>
              </SidebarMenuAction>
            }
            collectionType={CollectionType.WANTLIST}
          />
        ),
      },
      {
        title: 'Your other lists',
        url: '/lists/your',
        icon: NotebookTabs,
        authenticated: true,
        menuAction: (
          <NewCollectionDialog
            trigger={
              <SidebarMenuAction title="Add Wantlist">
                <Plus /> <span className="sr-only">Add card list</span>
              </SidebarMenuAction>
            }
            collectionType={CollectionType.OTHER}
          />
        ),
        separator: true,
      },
      {
        title: 'Public collections',
        url: '/collections/public',
        icon: BookOpen,
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
  const navigate = useNavigate({ from: Route.fullPath });
  const { theme } = useTheme();
  const { open, isMobile, setOpenMobile } = useSidebar();

  return (
    <Sidebar collapsible="icon" variant="sidebar">
      <SidebarHeader>
        <Link
          to="/"
          className={cn({ 'self-center': !isMobile, 'self-start pl-4': isMobile })}
          onClick={() => setOpenMobile(false)}
        >
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
            <img
              src={theme === 'light' ? LogoLightTheme : LogoDarkTheme}
              alt="Logo"
              className="w-32"
            />
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
                {g.items.map(i => (
                  <Fragment key={i.title}>
                    {!i.authenticated || (i.authenticated && user) ? (
                      <>
                        <SidebarMenuItem>
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
                          {'menuAction' in i ? i.menuAction : null}
                        </SidebarMenuItem>
                        {'separator' in i && i.separator ? <SidebarSeparator /> : null}
                      </>
                    ) : null}
                  </Fragment>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link
                    to={'/tools'}
                    className="[&.active]:font-bold"
                    onClick={() => {
                      setOpenMobile(false);
                    }}
                  >
                    <Hammer />
                    <span>Tools</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Comparer</SidebarGroupLabel>
          <SidebarGroupAction
            title="Open comparer"
            onClick={() => {
              void navigate({ to: `/comparer` });
              setOpenMobile(false);
            }}
          >
            <Scale className="w-4 h-4" /> <span className="sr-only">Open comparer</span>
          </SidebarGroupAction>
          <SidebarGroupContent>
            <SidebarComparer />
          </SidebarGroupContent>
        </SidebarGroup>
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
