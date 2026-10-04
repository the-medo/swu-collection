import { useRole } from '@/hooks/useRole';
import { UserReportHistory } from '@/components/app/admin/user-reports/UserReportHistory';
import { Button } from '@/components/ui/button.tsx';
import { Mail } from 'lucide-react';
import { useUser } from '@/hooks/useUser.ts';
import { getRouteApi, Link } from '@tanstack/react-router';
import { useGetUser } from '@/api/user/useGetUser.ts';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar.tsx';
import { useCountryList } from '@/api/lists/useCountryList.ts';
import { formatDate } from '@/lib/locale.ts';
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
import { UserCalendarTab } from './UserCalendarTab.tsx';
import { UserTournamentsTab } from './UserTournamentsTab.tsx';
import { ReportUserButton } from '../ReportUserButton.tsx';

const routeApi = getRouteApi('/users/$userId/');

const UserDetail: React.FC = () => {
  const { userId } = routeApi.useParams();
  const currentUser = useUser();
  const { userTab: requestedTab = 'decks' } = routeApi.useSearch();
  const isAdmin = useRole()('admin');
  const userTab = requestedTab === 'reports' && !isAdmin ? 'decks' : requestedTab;
  const navigate = routeApi.useNavigate();
  const { data: countryData } = useCountryList();
  const { data: user, isFetching, error } = useGetUser(userId);

  const userCountry = user?.country as CountryCode | undefined;
  const country = userCountry ? countryData?.countries[userCountry] : undefined;
  const state = user?.state;
  const createdAt = user?.createdAt;

  if (isFetching) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-4 w-full">
          <Skeleton className="h-40 w-40 min-h-40 min-w-40 rounded-lg" />
          <div className="flex flex-col gap-2 w-full">
            <Skeleton className="h-12 w-full rounded-lg" />
            <Skeleton className="h-8 w-full rounded-lg" />
            <Skeleton className="h-8 w-full rounded-lg" />
          </div>
        </div>
        <Skeleton className="h-12 w-full rounded-lg" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    );
  }

  if (error) return <Error404 title={'An error occured'} />;
  if (!user) return <Error404 title={'User not found'} />;

  return (
    <>
      <Helmet
        title={`${user?.displayName}${userTab === 'calendar' ? ' · Calendar' : userTab === 'tournaments' ? ' · Tournaments' : userTab === 'reports' ? ' · Reports' : ''} | SWUBase`}
      />
      <div className="flex min-w-0 flex-col gap-4">
        <div className="flex w-full min-w-0 flex-wrap items-center gap-4">
          <Avatar className="size-20 shrink-0 rounded-lg sm:size-40">
            <AvatarImage src={user?.image ?? undefined} alt={user?.name} />
            <AvatarFallback className="rounded-lg">{user?.name?.[0]}</AvatarFallback>
          </Avatar>
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <h2 className="break-words">{user?.displayName}</h2>
            <div className="flex flex-wrap gap-2 items-center">
              {country && (
                <>
                  <img src={country?.flag} alt={country?.code} className="w-6" />
                  {country?.name}
                </>
              )}
              {state && <span className="text-sm">({state})</span>}
            </div>
            {createdAt && <span className="text-sm">Member from: {formatDate(createdAt)}</span>}
            {currentUser &&
              currentUser.id !== userId &&
              currentUser.id !== 'swubase' &&
              userId !== 'swubase' && (
                <div className="flex flex-wrap items-center gap-2">
                  <Button asChild variant="outline" className="w-fit">
                    <Link to="/messages" search={{ with: userId }}>
                      <Mail aria-hidden="true" /> Send message
                    </Link>
                  </Button>
                  <ReportUserButton
                    userId={userId}
                    displayName={user.displayName}
                    source="profile"
                  />
                </div>
              )}
          </div>
        </div>
        <ProfileBio key={userId} userId={userId} />
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
          className="w-full"
        >
          <TabsList
            className={`grid h-auto w-full grid-cols-3 items-stretch ${isAdmin ? 'sm:grid-cols-6' : 'sm:grid-cols-5'}`}
          >
            <TabsTrigger
              value="decks"
              className="min-w-0 whitespace-normal px-1 text-xs sm:text-sm"
            >
              Decks
            </TabsTrigger>
            <TabsTrigger
              value="collections"
              className="min-w-0 whitespace-normal px-1 text-xs sm:text-sm"
            >
              Collections
            </TabsTrigger>
            <TabsTrigger
              value="wantlists"
              className="min-w-0 whitespace-normal px-1 text-xs sm:text-sm"
            >
              Wantlists
            </TabsTrigger>
            <TabsTrigger
              value="calendar"
              className="min-w-0 whitespace-normal px-1 text-xs sm:text-sm"
            >
              Calendar
            </TabsTrigger>
            <TabsTrigger
              value="tournaments"
              className="min-w-0 whitespace-normal px-1 text-xs sm:text-sm"
            >
              Tournaments
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger
                value="reports"
                className="min-w-0 whitespace-normal px-1 text-xs sm:text-sm"
              >
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
    </>
  );
};

export default UserDetail;
