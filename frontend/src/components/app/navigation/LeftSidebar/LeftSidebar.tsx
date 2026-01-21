import {
  Book,
  BookCheck,
  BookOpen,
  BookOpenCheck,
  ChartPieIcon,
  ChartSpline,
  LayoutGrid,
  NotebookTabs,
  Plus,
  Scale,
  ScrollText,
  Search,
  Star,
  TrophyIcon,
  Package,
} from 'lucide-react';

import {
  Sidebar,
  SidebarContent,
  SidebarContext,
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
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
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
import { CollectionType } from '../../../../../../types/enums.ts';
import SidebarComparer from '../../comparer/SidebarComparer/SidebarComparer.tsx';
import { Fragment, useMemo } from 'react';

const getGroups = (setOpenMobile: (open: boolean) => void, state: SidebarContext['state']) => [
  {
    title: 'Analysis & Decks',
    actionLabel: 'Add Deck',
    action: () => {},
    icon: BookCheck,
    items: [
      {
        title: 'Meta analysis',
        url: '/meta',
        icon: ChartPieIcon,
      },
      {
        title: 'Tournaments',
        url: '/tournaments',
        icon: TrophyIcon,
        separator: true,
        items: [
          {
            title: 'Planetary Qualifiers',
            url: '/tournaments/planetary-qualifiers',
          },
        ],
      },
      {
        title: 'Your decks',
        url: '/decks/your',
        icon: BookCheck,
        authenticated: true,
        menuAction: (
          <NewDeckDialog
            trigger={
              <SidebarMenuAction title="Add Collection">
                <Plus /> <span className="sr-only">Add Collection</span>
              </SidebarMenuAction>
            }
          />
        ),
      },
      {
        title: 'Decks',
        url: '/decks/public',
        icon: Book,
        menuAction: (
          <Link
            to="/decks/favorite"
            onClick={() => {
              setOpenMobile(false);
            }}
          >
            {state === 'expanded' ? (
              <SidebarMenuAction title="Favorite Decks">
                <Star /> <span className="sr-only">Favorite Decks</span>
              </SidebarMenuAction>
            ) : (
              <>
                <Star /> <span className="sr-only">Favorite Decks</span>
              </>
            )}
          </Link>
        ),
        displayMenuActionWhenCollapsed: true,
      },
      {
        title: 'Sealed deck',
        url: '/limited',
        icon: Package,
      },
      /*{
        title: 'Your statistics',
        url: '/statistics',
        icon: ChartSpline,
        authenticated: true,
      },*/
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
        title: 'Collections',
        url: '/collections/public',
        icon: BookOpen,
      },
      {
        title: 'Wantlists',
        url: '/wantlists/public',
        icon: ScrollText,
      },
    ],
  },
];

export function LeftSidebar() {
  const user = useUser();
  const { theme } = useTheme();
  const { open, state, isMobile, setOpenMobile } = useSidebar();

  const groups = useMemo(() => getGroups(setOpenMobile, state), [state]);

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
              <h3 className="mb-0">
                <span className="font-normal">SWU</span>
                <span className="font-bold">BASE</span>
              </h3>
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
              <>
                <CardSearchCommand id="card-search-left-sidebar" />
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <Link
                        to={'/cards/search'}
                        className="[&.active]:font-bold"
                        onClick={() => {
                          setOpenMobile(false);
                        }}
                      >
                        <LayoutGrid />
                        Card database
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </>
            ) : (
              <SidebarMenuButton asChild>
                <Link
                  to="/cards/search"
                  className="[&.active]:font-bold"
                  onClick={() => {
                    setOpenMobile(false);
                  }}
                >
                  <Search />
                  <span>Search</span>
                </Link>
              </SidebarMenuButton>
            )}
          </SidebarGroupContent>
        </SidebarGroup>
        {groups.map(g => (
          <SidebarGroup key={g.title} className="py-0">
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
                          {'menuAction' in i && state !== 'collapsed' ? i.menuAction : null}
                        </SidebarMenuItem>
                        {'items' in i && i.items && i.items.length > 0 && (
                          <SidebarMenuSub>
                            {i.items.map(subItem => (
                              <SidebarMenuSubItem key={subItem.title}>
                                <SidebarMenuSubButton asChild size="md">
                                  <Link
                                    to={subItem.url}
                                    onClick={() => {
                                      setOpenMobile(false);
                                    }}
                                  >
                                    <span>{subItem.title}</span>
                                  </Link>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            ))}
                          </SidebarMenuSub>
                        )}
                        {'menuAction' in i &&
                          'displayMenuActionWhenCollapsed' in i &&
                          state === 'collapsed' && (
                            <SidebarMenuItem>
                              <SidebarMenuButton asChild>{i.menuAction}</SidebarMenuButton>
                            </SidebarMenuItem>
                          )}
                        {'separator' in i && i.separator ? <SidebarSeparator /> : null}
                      </>
                    ) : null}
                  </Fragment>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
        {/*<SidebarGroup>
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
        </SidebarGroup>*/}
        <SidebarGroup>
          <SidebarGroupLabel>Comparer</SidebarGroupLabel>
          <SidebarGroupAction asChild>
            <Link
              to={'/comparer'}
              title="Open comparer"
              onClick={() => {
                setOpenMobile(false);
              }}
            >
              <Scale className="w-4 h-4" /> <span className="sr-only">Open comparer</span>
            </Link>
          </SidebarGroupAction>
          <SidebarGroupContent>
            <SidebarComparer setOpenMobile={setOpenMobile} />
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
