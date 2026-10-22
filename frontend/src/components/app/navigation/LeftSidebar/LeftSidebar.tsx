import { useLocation } from '@tanstack/react-router';
import { useCrossfireInvitations } from '@/components/app/crossfire/invitationContext.ts';
import {
  ChartPieIcon,
  ChartSpline,
  LayoutGrid,
  Map,
  Plus,
  Scale,
  Star,
  TrophyIcon,
  Users,
  ArrowUpRight,
  Radio,
  X,
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
import { Link, useMatch } from '@tanstack/react-router';
import SignIn from '@/components/app/auth/SignIn.tsx';
import { useRole } from '@/hooks/useRole.ts';
import { useUser } from '@/hooks/useUser.ts';
import NewCollectionDialog from '@/components/app/dialogs/NewCollectionDialog.tsx';
import LogoLightTheme from '../../../../assets/logo-light-theme.svg';
import LogoDarkTheme from '../../../../assets/logo-dark-theme.svg';
import { useTheme } from '@/components/theme-provider.tsx';
import NewDeckDialog from '@/components/app/dialogs/NewDeckDialog/NewDeckDialog.tsx';
import NewTeamDialog from '@/components/app/dialogs/NewTeamDialog.tsx';
import { useTeam, useTeams } from '@/api/teams';
import CardSearchCommand from '@/components/app/global/CardSearchCommand/CardSearchCommand.tsx';
import SocialLinks from '@/components/app/navigation/LeftSidebar/SocialLinks.tsx';
import { cn } from '@/lib/utils.ts';
import { CollectionType } from '../../../../../../types/enums.ts';
import SidebarComparer from '../../comparer/SidebarComparer/SidebarComparer.tsx';
import { Fragment, useMemo } from 'react';
import { UserTeam } from '../../../../../../server/routes/teams/get.ts';
import { Badge } from '@/components/ui/badge.tsx';
import { CrossfireLogo } from '@/components/app/crossfire/CrossfireLogo.tsx';
import { SidebarYourTournaments } from './SidebarYourTournaments.tsx';
import { useSidebarSettings } from '@/api/user/useSidebarSettings.ts';
import { Button } from '@/components/ui/button.tsx';
import {
  CardListIcon,
  CollectionIcon,
  DeckIcon,
  SealedDeckIcon,
  WantlistIcon,
} from '@/components/app/global/icons/CardLibraryIcons.tsx';
import './left-sidebar.css';

const getGroups = (
  setOpenMobile: (open: boolean) => void,
  state: SidebarContext['state'],
  teams: UserTeam[],
) => [
  {
    id: 'analysis-and-decks',
    title: 'Analysis & Decks',
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
        menuAction:
          state === 'expanded' ? (
            <SidebarMenuAction asChild title="Tournament map">
              <Link to="/tournaments/map" onClick={() => setOpenMobile(false)}>
                <Map /> <span className="sr-only">Tournament map</span>
              </Link>
            </SidebarMenuAction>
          ) : (
            <Link to="/tournaments/map" title="Tournament map" onClick={() => setOpenMobile(false)}>
              <Map /> <span className="sr-only">Tournament map</span>
            </Link>
          ),
        displayMenuActionWhenCollapsed: true,
        separator: true,
        items: [
          {
            title: 'Planetary Qualifiers',
            url: '/tournaments/planetary-qualifiers',
          },
        ],
      },
      {
        title: 'Crossfire',
        url: '/crossfire',
        icon: CrossfireLogo,
        authenticated: true,
        beta: true,
      },
      {
        title: 'Your decks',
        url: '/decks/your',
        icon: DeckIcon,
        authenticated: true,
        menuAction: (
          <NewDeckDialog
            trigger={
              <SidebarMenuAction title="Add Deck">
                <Plus /> <span className="sr-only">Add Deck</span>
              </SidebarMenuAction>
            }
          />
        ),
      },
      {
        title: 'Decks',
        url: '/decks/public',
        icon: DeckIcon,
        menuAction:
          state === 'expanded' ? (
            <SidebarMenuAction asChild title="Favorite Decks">
              <Link to="/decks/favorite" onClick={() => setOpenMobile(false)}>
                <Star /> <span className="sr-only">Favorite Decks</span>
              </Link>
            </SidebarMenuAction>
          ) : (
            <Link to="/decks/favorite" onClick={() => setOpenMobile(false)}>
              <Star /> <span className="sr-only">Favorite Decks</span>
            </Link>
          ),
        displayMenuActionWhenCollapsed: true,
      },
      {
        title: 'Sealed deck',
        url: '/limited',
        icon: SealedDeckIcon,
      },
      {
        title: 'Your statistics',
        url: '/statistics',
        icon: ChartSpline,
      },
      {
        title: 'Teams',
        url: '/teams',
        icon: Users,
        menuAction: (
          <NewTeamDialog
            trigger={
              <SidebarMenuAction title="Create Team">
                <Plus /> <span className="sr-only">Create Team</span>
              </SidebarMenuAction>
            }
          />
        ),
        items:
          teams && teams.length > 0
            ? teams.map(team => ({
                title: team.name,
                url: `/teams/${team.shortcut ?? team.id}`,
                statisticsUrl: `/teams/${team.shortcut ?? team.id}/statistics`,
              }))
            : [],
      },
    ],
  },
  {
    id: 'lists',
    title: 'Collections & Lists',
    items: [
      {
        title: 'Your collections',
        url: '/collections/your',
        icon: CollectionIcon,
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
        icon: WantlistIcon,
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
        icon: CardListIcon,
        authenticated: true,
        menuAction: (
          <NewCollectionDialog
            trigger={
              <SidebarMenuAction title="Add card list">
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
        icon: CollectionIcon,
      },
      {
        title: 'Wantlists',
        url: '/wantlists/public',
        icon: WantlistIcon,
      },
    ],
  },
];

export function LeftSidebar() {
  const user = useUser();
  const { data: sidebarSettings, isPending: sidebarSettingsPending } = useSidebarSettings();
  const showLists =
    !user ||
    (!sidebarSettingsPending && (sidebarSettings?.left_sidebar_collections_and_lists ?? true));
  const canCrossfire = useRole()('crossfire');
  const isCrossfire = useLocation({
    select: location => location.pathname.startsWith('/crossfire'),
  });
  const { count: invitationCount } = useCrossfireInvitations();
  const { theme } = useTheme();
  const { state, isMobile, setOpenMobile } = useSidebar();
  const expanded = isMobile || state === 'expanded';
  const teamMatch = useMatch({ from: '/teams/$teamId', shouldThrow: false });

  const teamIdOrShortcut = teamMatch?.params?.teamId;

  const { data: activeTeam } = useTeam(teamIdOrShortcut);

  const { data: teams } = useTeams();

  const groups = useMemo(
    () =>
      getGroups(setOpenMobile, expanded ? 'expanded' : 'collapsed', teams ?? [])
        .filter(group => group.id !== 'lists' || showLists)
        .map(group => ({
          ...group,
          items: group.items.filter(item => item.url !== '/crossfire' || canCrossfire),
        })),
    [setOpenMobile, expanded, teams, canCrossfire, showLists],
  );

  const swubaseLogo = theme === 'light' ? LogoLightTheme : LogoDarkTheme;

  return (
    <Sidebar collapsible="icon" variant="sidebar">
      <div className="left-sidebar flex h-full min-h-0 flex-col" data-expanded={expanded}>
        <SidebarHeader className="p-3 pb-2 group-data-[collapsible=icon]:p-2">
          <div className="flex items-center gap-2">
            {activeTeam?.logoUrl && teamIdOrShortcut ? (
              <>
                <Link
                  to="/teams/$teamId"
                  params={{ teamId: teamIdOrShortcut }}
                  className="sidebar-brand flex min-w-0 flex-1 items-center gap-3 rounded-xl"
                  onClick={() => setOpenMobile(false)}
                  aria-label={activeTeam.name}
                >
                  <img
                    src={activeTeam.logoUrl}
                    alt=""
                    className={cn(
                      'shrink-0 rounded-lg object-cover',
                      expanded ? 'size-10' : 'size-8',
                    )}
                  />
                  {expanded && (
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">
                        {activeTeam.name}
                      </span>
                      <span className="block text-[10px] text-muted-foreground">
                        Your team on SWUBASE
                      </span>
                    </span>
                  )}
                </Link>
                {expanded && (
                  <Link
                    to="/"
                    aria-label="SWUBASE home"
                    onClick={() => setOpenMobile(false)}
                    className="sidebar-brand shrink-0 rounded-lg p-1"
                  >
                    <img src={swubaseLogo} alt="" className="size-6" />
                  </Link>
                )}
              </>
            ) : (
              <Link
                to="/"
                aria-label="SWUBASE home"
                className="sidebar-brand flex min-w-0 flex-1 items-center gap-3 rounded-xl"
                onClick={() => setOpenMobile(false)}
              >
                {isCrossfire && canCrossfire ? (
                  <CrossfireLogo className={expanded ? 'h-10 w-12 shrink-0' : 'size-8 shrink-0'} />
                ) : (
                  <span
                    className={cn(
                      'grid shrink-0 place-items-center rounded-xl bg-[#17352e]',
                      expanded ? 'size-11' : 'size-8 rounded-lg',
                    )}
                  >
                    <img
                      src={LogoDarkTheme}
                      alt=""
                      className={cn('brightness-0 invert', expanded ? 'size-8' : 'size-6')}
                    />
                  </span>
                )}
                {expanded && (
                  <span className="min-w-0">
                    <span className="block text-[23px] leading-none tracking-[-0.06em]">
                      <span className="font-normal">SWU</span>
                      <strong className="font-bold">BASE</strong>
                    </span>
                    <span className="mt-1 block text-[10px] text-muted-foreground">
                      Your Unlimited companion
                    </span>
                  </span>
                )}
              </Link>
            )}
            {isMobile && (
              <Button
                variant="ghost"
                size="icon"
                className="size-8 shrink-0"
                aria-label="Close menu"
                onClick={() => setOpenMobile(false)}
              >
                <X className="size-4" />
              </Button>
            )}
          </div>
        </SidebarHeader>
        <SidebarContent
          role="navigation"
          aria-label="Main navigation"
          className="gap-3 pb-3 group-data-[collapsible=icon]:overflow-y-auto"
        >
          <SidebarGroup className="gap-2 pt-2 pb-0">
            <SidebarGroupContent className="space-y-2">
              {expanded && (
                <div className="sidebar-card-search">
                  <CardSearchCommand id="card-search-left-sidebar" />
                </div>
              )}
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Card database" className="sidebar-database">
                    <Link to="/cards/search" onClick={() => setOpenMobile(false)}>
                      <LayoutGrid aria-hidden="true" />
                      <span className="flex-1">Card database</span>
                      {expanded && (
                        <ArrowUpRight className="size-3.5! opacity-60" aria-hidden="true" />
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Creators" className="sidebar-creators">
                    <Link to="/creators" onClick={() => setOpenMobile(false)}>
                      <Radio className="sidebar-creators-icon" aria-hidden="true" />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2 font-semibold">
                          Creators
                          {expanded && <span className="sidebar-preview">Preview</span>}
                        </span>
                        {expanded && (
                          <span className="mt-1 block text-[10px] font-normal opacity-80">
                            Fresh voices. More ways to play.
                          </span>
                        )}
                      </span>
                      {expanded && (
                        <ArrowUpRight className="size-3.5! opacity-60" aria-hidden="true" />
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
          {user && <SidebarYourTournaments key={user.id} />}
          {groups.map(g => (
            <SidebarGroup key={g.id} className="py-0">
              <SidebarGroupLabel>{g.title}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {g.items.map(i => (
                    <Fragment key={i.title}>
                      {!i.authenticated || (i.authenticated && user) ? (
                        <>
                          <SidebarMenuItem>
                            <SidebarMenuButton asChild tooltip={i.title}>
                              <Link
                                to={i.url}
                                className="[&.active]:font-bold"
                                onClick={() => {
                                  setOpenMobile(false);
                                }}
                              >
                                <i.icon />
                                <span>{i.title}</span>
                                {i.url === '/crossfire' && invitationCount > 0 && (
                                  <Badge
                                    aria-label={`${invitationCount} Crossfire invitations`}
                                    size="small"
                                    className="ml-auto px-2"
                                  >
                                    {invitationCount}
                                  </Badge>
                                )}
                                {'beta' in i && i.beta && (
                                  <Badge size="small" className="text-xs px-2" variant="outline">
                                    Beta
                                  </Badge>
                                )}
                              </Link>
                            </SidebarMenuButton>
                            {'menuAction' in i && expanded ? i.menuAction : null}
                          </SidebarMenuItem>
                          {'items' in i && i.items && i.items.length > 0 && (
                            <SidebarMenuSub>
                              {i.items.map(subItem => (
                                <SidebarMenuSubItem key={subItem.title} className="relative">
                                  <SidebarMenuSubButton
                                    asChild
                                    size="md"
                                    className={cn(
                                      'statisticsUrl' in subItem && subItem.statisticsUrl && 'pr-8',
                                    )}
                                  >
                                    <Link
                                      to={subItem.url}
                                      title={subItem.title}
                                      onClick={() => {
                                        setOpenMobile(false);
                                      }}
                                    >
                                      <span>{subItem.title}</span>
                                    </Link>
                                  </SidebarMenuSubButton>
                                  {'statisticsUrl' in subItem && subItem.statisticsUrl && (
                                    <SidebarMenuAction asChild title="Team statistics">
                                      <Link
                                        to={subItem.statisticsUrl}
                                        onClick={() => setOpenMobile(false)}
                                        className="text-muted-foreground hover:text-foreground transition-colors"
                                      >
                                        <ChartSpline className="h-3.5 w-3.5" />
                                        <span className="sr-only">Team statistics</span>
                                      </Link>
                                    </SidebarMenuAction>
                                  )}
                                </SidebarMenuSubItem>
                              ))}
                            </SidebarMenuSub>
                          )}
                          {'menuAction' in i &&
                            'displayMenuActionWhenCollapsed' in i &&
                            !expanded && (
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
        <div className="border-t border-border/70 px-1 py-1 group-data-[collapsible=icon]:px-0">
          <SocialLinks />
        </div>
        <SidebarFooter className="pt-0">
          <SignIn isLeftSidebar forceTextButton={expanded} />
        </SidebarFooter>
      </div>
      <SidebarRail />
    </Sidebar>
  );
}
