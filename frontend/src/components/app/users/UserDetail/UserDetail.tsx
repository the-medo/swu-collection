import { useRole } from '@/hooks/useRole';
import { UserReportHistory } from '@/components/app/admin/user-reports/UserReportHistory';
import { Button } from '@/components/ui/button.tsx';
import { Mail, Settings } from 'lucide-react';
import { useUser } from '@/hooks/useUser.ts';
import { getRouteApi, Link } from '@tanstack/react-router';
import { useGetUser } from '@/api/user/useGetUser.ts';
import { useCountryList } from '@/api/lists/useCountryList.ts';
import { CountryCode } from '../../../../../../server/db/lists.ts';
import UserDecks from '@/components/app/decks/UserDecks/UserDecks.tsx';
import { Tabs } from '@radix-ui/react-tabs';
import { TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.tsx';
import * as React from 'react';
import UserCollections from '@/components/app/collections/UserCollections/UserCollections.tsx';
import { Skeleton } from '@/components/ui/skeleton.tsx';
import Error404 from '@/components/app/pages/error/Error404.tsx';
import { CollectionType } from '../../../../../../types/enums.ts';
import { Helmet } from 'react-helmet-async';
import { ProfileBio } from './ProfileBio.tsx';
import { ProfileHeader } from './ProfileHeader.tsx';
import { ProfileFavorites, ProfileFavoritesSkeleton } from './ProfileFavorites.tsx';
import {
  ProfileAvatar,
  ProfileAvatarSkeleton,
  ProfileSidebar,
  ProfileSidebarSkeleton,
} from './ProfileSidebar.tsx';
import { UserCalendarTab } from './UserCalendarTab.tsx';
import { UserTournamentsTab } from './UserTournamentsTab.tsx';
import { ReportUserButton } from '../ReportUserButton.tsx';

const routeApi = getRouteApi('/users/$userId/');

const pageClassName = 'flex min-h-dvh min-w-0 flex-col';
const columnsClassName =
  'grid min-w-0 flex-1 grid-cols-[92px_minmax(0,1fr)] grid-rows-[auto_auto_auto_1fr] @[401px]/main-body:grid-cols-[112px_minmax(0,1fr)] @[761px]/main-body:grid-cols-[208px_minmax(0,1fr)] @[761px]/main-body:grid-rows-[auto_auto_1fr] @[1001px]/main-body:grid-cols-[240px_minmax(0,1fr)]';
const nameClassName = 'col-start-2 row-start-1 min-w-0 p-4';
const bioClassName =
  'col-span-2 row-start-2 min-w-0 @[761px]/main-body:col-span-1 @[761px]/main-body:col-start-2';
const contentClassName =
  'col-span-2 row-start-4 min-w-0 @[761px]/main-body:col-span-1 @[761px]/main-body:col-start-2 @[761px]/main-body:row-start-3';
const dividerClassName = 'm-0 border-t border-border';
const tabTriggerClassName =
  '-mb-px min-h-11 min-w-0 shrink-0 whitespace-normal rounded-none border-b-2 border-transparent px-1 py-3 text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-inset @[401px]/main-body:text-sm data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none';

const UserDetail: React.FC = () => {
  const { userId } = routeApi.useParams();
  const [bioActionsContainer, setBioActionsContainer] = React.useState<HTMLDivElement | null>(null);
  const currentUser = useUser();
  const canContact =
    !!currentUser &&
    currentUser.id !== userId &&
    currentUser.id !== 'swubase' &&
    userId !== 'swubase';
  const { userTab: requestedTab = 'decks' } = routeApi.useSearch();
  const isAdmin = useRole()('admin');
  const userTab = requestedTab === 'reports' && !isAdmin ? 'decks' : requestedTab;
  const navigate = routeApi.useNavigate();
  const { data: countryData } = useCountryList();
  const { data: user, isFetching, error } = useGetUser(userId);

  const userCountry = user?.country as CountryCode | undefined;
  const country = userCountry ? countryData?.countries[userCountry] : undefined;

  if (isFetching) {
    return (
      <div className={pageClassName} role="status" aria-label="Loading profile" aria-busy="true">
        <Skeleton className="aspect-[4/1] w-full shrink-0 rounded-none bg-[radial-gradient(ellipse_at_75%_130%,#5d7981_0%,#263f50_24%,#122431_48%,#0a141e_78%)]" />
        <div className={columnsClassName}>
          <ProfileAvatarSkeleton />
          <div className={nameClassName}>
            <Skeleton className="h-9 w-64 max-w-full @[761px]/main-body:h-11" />
          </div>
          <div className={bioClassName}>
            <hr className={dividerClassName} />
            <div className="p-4">
              <Skeleton className="h-24 w-full" />
            </div>
          </div>
          <ProfileSidebarSkeleton
            favorites={<ProfileFavoritesSkeleton />}
            actionCount={currentUser?.id === userId || canContact ? 2 : 0}
          />
          <div className={contentClassName}>
            <hr className={dividerClassName} />
            <div className="p-2">
              <Skeleton className="mb-4 h-12 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="p-2">
        <Error404 title={error ? 'An error occurred' : 'User not found'} />
      </div>
    );
  }

  return (
    <>
      <Helmet
        title={`${user?.displayName}${userTab === 'calendar' ? ' · Calendar' : userTab === 'tournaments' ? ' · Tournaments' : userTab === 'reports' ? ' · Reports' : ''} | SWUBase`}
      />
      <div className={pageClassName}>
        <ProfileHeader userId={user.id} canEdit={currentUser?.id === userId} />
        <div className={columnsClassName}>
          <ProfileAvatar user={user} canEdit={currentUser?.id === userId} />
          <div className={nameClassName}>
            <h1 className="m-0! min-w-0 p-0 text-[clamp(28px,3.2cqi,44px)]! leading-[1.15]! font-bold! tracking-[-0.045em]! [overflow-wrap:anywhere]">
              {user.displayName}
            </h1>
          </div>
          <div className={bioClassName}>
            <hr className={dividerClassName} />
            <div className="min-w-0 p-4 empty:hidden">
              <ProfileBio key={userId} userId={userId} actionsContainer={bioActionsContainer} />
            </div>
          </div>
          <ProfileSidebar
            user={user}
            country={country}
            reserveActionSpace={currentUser?.id === userId}
            favorites={
              <ProfileFavorites key={userId} userId={userId} canEdit={currentUser?.id === userId} />
            }
          >
            {currentUser?.id === userId && (
              <Button asChild variant="outline">
                <Link to="/settings" search={{ page: 'profile' }}>
                  <Settings className="size-4" aria-hidden="true" /> User settings
                </Link>
              </Button>
            )}
            {canContact && (
              <>
                <Button asChild>
                  <Link to="/messages" search={{ with: userId }}>
                    <Mail aria-hidden="true" /> Send message
                  </Link>
                </Button>
                <ReportUserButton
                  userId={userId}
                  displayName={user.displayName}
                  source="profile"
                  variant="ghost"
                  className="text-muted-foreground hover:text-foreground"
                />
              </>
            )}
            <div ref={setBioActionsContainer} className="empty:hidden" />
          </ProfileSidebar>
          <div className={contentClassName}>
            <hr className={dividerClassName} />
            <div className="p-2">
              <Tabs
                value={userTab}
                onValueChange={value => {
                  if (
                    value === 'decks' ||
                    value === 'collections' ||
                    value === 'wantlists' ||
                    value === 'calendar' ||
                    value === 'tournaments' ||
                    (value === 'reports' && isAdmin)
                  )
                    void navigate({
                      search: previous => ({ ...previous, userTab: value }),
                      resetScroll: false,
                    });
                }}
                className="w-full [&_[role=tabpanel]]:min-w-0 [&_[role=tabpanel]]:overflow-x-auto"
              >
                <TabsList
                  aria-label="Profile sections"
                  className="grid h-auto w-full grid-cols-3 items-stretch gap-x-3 rounded-none border-b border-border bg-transparent p-0 @[761px]/main-body:flex @[761px]/main-body:flex-wrap @[761px]/main-body:justify-start @[761px]/main-body:gap-x-5"
                >
                  <TabsTrigger value="decks" className={tabTriggerClassName}>
                    Decks
                  </TabsTrigger>
                  <TabsTrigger value="collections" className={tabTriggerClassName}>
                    Collections
                  </TabsTrigger>
                  <TabsTrigger value="wantlists" className={tabTriggerClassName}>
                    Wantlists
                  </TabsTrigger>
                  <TabsTrigger value="calendar" className={tabTriggerClassName}>
                    Calendar
                  </TabsTrigger>
                  <TabsTrigger value="tournaments" className={tabTriggerClassName}>
                    Tournaments
                  </TabsTrigger>
                  {isAdmin && (
                    <TabsTrigger value="reports" className={tabTriggerClassName}>
                      Reports
                    </TabsTrigger>
                  )}
                </TabsList>
                {isAdmin && (
                  <TabsContent value="reports">
                    <UserReportHistory userId={userId} />
                  </TabsContent>
                )}
                <TabsContent value="decks">
                  <UserDecks userId={userId} />
                </TabsContent>
                <TabsContent value="collections">
                  <UserCollections userId={userId} collectionType={CollectionType.COLLECTION} />
                </TabsContent>
                <TabsContent value="wantlists">
                  <UserCollections userId={userId} collectionType={CollectionType.WANTLIST} />
                </TabsContent>
                <TabsContent value="calendar">
                  <UserCalendarTab userId={userId} />
                </TabsContent>
                <TabsContent value="tournaments">
                  <UserTournamentsTab key={userId} userId={userId} />
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default UserDetail;
