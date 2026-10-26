import { sidebarStyles } from '@/components/app/navigation/LeftSidebar/sidebarStyles';
import { useLocation } from '@tanstack/react-router';
import { useCrossfireInvitations } from '@/components/app/crossfire/invitationContext.ts';
import {
  ChartPieIcon,
  ChartSpline,
  LayoutGrid,
  Map,
  Plus,
  Star,
  TrophyIcon,
  Users,
  Earth,
  Radio,
  X,
} from 'lucide-react';

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
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
import { SidebarNavigationItem, type SidebarNavigationEntry } from './SidebarNavigationItem.tsx';
import { MobileMoreMenu } from '../MobileNavigation/MobileMoreMenu.tsx';

const getGroups = ({
  setOpenMobile,
  teams,
  authenticated,
  showLists,
  canCrossfire,
  isAdmin,
  invitationCount,
}: {
  setOpenMobile: (open: boolean) => void;
  teams: UserTeam[];
  authenticated: boolean;
  showLists: boolean;
  canCrossfire: boolean;
  isAdmin: boolean;
  invitationCount: number;
}): { id: string; title: string; items: SidebarNavigationEntry[] }[] => {
  const teamsItem: SidebarNavigationEntry = {
    title: 'Teams',
    url: '/teams',
    icon: Users,
    submenu: 'always',
    action: (
      <NewTeamDialog
        trigger={
          <SidebarMenuAction title="Create Team">
            <Plus />
            <span className="sr-only">Create Team</span>
          </SidebarMenuAction>
        }
      />
    ),
    items: teams.map(team => ({
      title: team.name,
      url: `/teams/${team.shortcut ?? team.id}`,
      statisticsUrl: `/teams/${team.shortcut ?? team.id}/statistics`,
    })),
  };
  const publicLists: SidebarNavigationEntry[] = showLists
    ? [
        { title: 'Collections', url: '/collections/public', icon: CollectionIcon },
        { title: 'Wantlists', url: '/wantlists/public', icon: WantlistIcon },
      ]
    : [];
  return [
    {
      id: 'explore',
      title: 'Explore',
      items: [
        { title: 'Meta analysis', url: '/meta', icon: ChartPieIcon },
        {
          title: 'Tournaments',
          url: '/tournaments',
          icon: TrophyIcon,
          action: (
            <SidebarMenuAction asChild title="Tournament map">
              <Link to="/tournaments/map" onClick={() => setOpenMobile(false)}>
                <Map />
                <span className="sr-only">Tournament map</span>
              </Link>
            </SidebarMenuAction>
          ),
          items: [
            { title: 'Planetary Qualifiers', url: '/tournaments/planetary-qualifiers' },
            { title: 'Tournament map', url: '/tournaments/map' },
            ...(authenticated ? [{ title: 'Your calendar', url: '/tournaments/calendar' }] : []),
          ],
        },
        {
          title: 'Public decks',
          url: '/decks/public',
          icon: DeckIcon,
          action: (
            <SidebarMenuAction asChild title="Favorite Decks">
              <Link to="/decks/favorite" onClick={() => setOpenMobile(false)}>
                <Star />
                <span className="sr-only">Favorite Decks</span>
              </Link>
            </SidebarMenuAction>
          ),
          items: authenticated ? undefined : [{ title: 'Favorite decks', url: '/decks/favorite' }],
          submenu: 'collapsed-only' as const,
        },
        ...(isAdmin
          ? [
              {
                title: 'Creators',
                url: '/creators',
                icon: Radio,
                className: sidebarStyles.creators,
                badge: <span className={sidebarStyles.preview}>Preview</span>,
              },
            ]
          : []),
        ...(!authenticated ? publicLists : []),
      ],
    },
    {
      id: 'play',
      title: 'Play',
      items: [
        ...(authenticated && canCrossfire
          ? [
              {
                title: 'Crossfire',
                url: '/crossfire',
                icon: CrossfireLogo,
                badge: (
                  <>
                    {invitationCount > 0 && (
                      <Badge
                        aria-label={`${invitationCount} Crossfire invitations`}
                        size="small"
                        className="ml-auto px-2"
                      >
                        {invitationCount}
                      </Badge>
                    )}
                    <Badge size="small" className="text-[10px] px-1.5" variant="outline">
                      Beta
                    </Badge>
                  </>
                ),
              },
            ]
          : []),
        ...(authenticated
          ? [
              {
                title: 'Decks',
                label: 'Your decks',
                url: '/decks/your',
                icon: DeckIcon,
                action: (
                  <NewDeckDialog
                    trigger={
                      <SidebarMenuAction title="Add Deck">
                        <Plus />
                        <span className="sr-only">Add Deck</span>
                      </SidebarMenuAction>
                    }
                  />
                ),
                items: [{ title: 'Favorite decks', url: '/decks/favorite' }],
                submenu: 'collapsed-only' as const,
              },
            ]
          : []),
        { title: 'Sealed deck', url: '/limited', icon: SealedDeckIcon },
        ...(authenticated
          ? [
              {
                title: 'Statistics',
                label: 'Your statistics',
                url: '/statistics',
                icon: ChartSpline,
              },
            ]
          : []),
        teamsItem,
      ],
    },
    ...(authenticated && showLists
      ? [
          {
            id: 'your-space',
            title: 'Your space',
            items: [
              {
                title: 'Collections',
                label: 'Your collections',
                url: '/collections/your',
                icon: CollectionIcon,
                action: (
                  <NewCollectionDialog
                    collectionType={CollectionType.COLLECTION}
                    trigger={
                      <SidebarMenuAction title="Add Collection">
                        <Plus />
                        <span className="sr-only">Add Collection</span>
                      </SidebarMenuAction>
                    }
                  />
                ),
                items: [{ title: 'Public collections', url: '/collections/public' }],
                submenu: 'collapsed-only' as const,
                secondaryAction: (
                  <SidebarMenuAction asChild title="Public collections">
                    <Link to="/collections/public" onClick={() => setOpenMobile(false)}>
                      <Earth />
                      <span className="sr-only">Public collections</span>
                    </Link>
                  </SidebarMenuAction>
                ),
              },
              {
                title: 'Wantlists',
                label: 'Your wantlists',
                url: '/wantlists/your',
                icon: WantlistIcon,
                action: (
                  <NewCollectionDialog
                    collectionType={CollectionType.WANTLIST}
                    trigger={
                      <SidebarMenuAction title="Add Wantlist">
                        <Plus />
                        <span className="sr-only">Add Wantlist</span>
                      </SidebarMenuAction>
                    }
                  />
                ),
                items: [{ title: 'Public wantlists', url: '/wantlists/public' }],
                submenu: 'collapsed-only' as const,
                secondaryAction: (
                  <SidebarMenuAction asChild title="Public wantlists">
                    <Link to="/wantlists/public" onClick={() => setOpenMobile(false)}>
                      <Earth />
                      <span className="sr-only">Public wantlists</span>
                    </Link>
                  </SidebarMenuAction>
                ),
              },
              {
                title: 'Lists',
                label: 'Your other lists',
                url: '/lists/your',
                icon: CardListIcon,
                action: (
                  <NewCollectionDialog
                    collectionType={CollectionType.OTHER}
                    trigger={
                      <SidebarMenuAction title="Add card list">
                        <Plus />
                        <span className="sr-only">Add card list</span>
                      </SidebarMenuAction>
                    }
                  />
                ),
              },
            ],
          },
        ]
      : []),
  ];
};

export function LeftSidebar() {
  const user = useUser();
  const { data: sidebarSettings, isPending: sidebarSettingsPending } = useSidebarSettings();
  const showLists =
    !user ||
    (!sidebarSettingsPending && (sidebarSettings?.left_sidebar_collections_and_lists ?? true));
  const hasRole = useRole();
  const canCrossfire = hasRole('crossfire');
  const isAdmin = hasRole('admin');
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

  const groups = getGroups({
    setOpenMobile,
    teams: teams ?? [],
    authenticated: Boolean(user),
    showLists,
    canCrossfire,
    isAdmin,
    invitationCount,
  });

  const swubaseLogo = theme === 'light' ? LogoLightTheme : LogoDarkTheme;

  if (isMobile) {
    return (
      <Sidebar mobileSide="bottom" mobileLabel="More on SWUBASE" mobileId="mobile-more-menu">
        <MobileMoreMenu groups={groups} />
      </Sidebar>
    );
  }

  return (
    <Sidebar collapsible="icon" variant="sidebar">
      <div
        className={cn('flex h-full min-h-0 flex-col', sidebarStyles.sidebar)}
        data-expanded={expanded}
      >
        <SidebarHeader className="p-3 pb-2 group-data-[collapsible=icon]:p-2">
          <div className="flex items-center gap-2">
            {activeTeam?.logoUrl && teamIdOrShortcut ? (
              <>
                <Link
                  to="/teams/$teamId"
                  params={{ teamId: teamIdOrShortcut }}
                  className={cn(
                    'flex min-w-0 flex-1 items-center gap-3 rounded-xl',
                    sidebarStyles.brand,
                  )}
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
                    className={cn('shrink-0 rounded-lg p-1', sidebarStyles.brand)}
                  >
                    <img src={swubaseLogo} alt="" className="size-6" />
                  </Link>
                )}
              </>
            ) : (
              <Link
                to="/"
                aria-label="SWUBASE home"
                className={cn(
                  'flex min-w-0 flex-1 items-center gap-3 rounded-xl',
                  sidebarStyles.brand,
                )}
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
                <div className={sidebarStyles.cardSearch}>
                  <CardSearchCommand id="card-search-left-sidebar" />
                </div>
              )}
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    tooltip="Card database"
                    className={sidebarStyles.database}
                  >
                    <Link to="/cards/search" onClick={() => setOpenMobile(false)}>
                      <LayoutGrid aria-hidden="true" />
                      <span className="flex-1">Card database</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
          {user && expanded && <SidebarYourTournaments />}
          {groups.map(group => (
            <SidebarGroup key={group.id} className="py-0">
              <SidebarGroupLabel>{group.title}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {group.items.map(item => (
                    <SidebarNavigationItem key={item.url} item={item} />
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
          <SidebarGroup className="py-0">
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarComparer setOpenMobile={setOpenMobile} />
                </SidebarMenuItem>
              </SidebarMenu>
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
