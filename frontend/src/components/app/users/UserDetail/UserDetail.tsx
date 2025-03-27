import { getRouteApi } from '@tanstack/react-router';
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

const routeApi = getRouteApi('/users/$userId/');

const UserDetail: React.FC = () => {
  const { userId } = routeApi.useParams();
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
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4 w-full">
        <Avatar className="h-40 w-40 min-h-40 min-w-40 rounded-lg">
          <AvatarImage src={user?.image ?? undefined} alt={user?.name} />
          <AvatarFallback className="rounded-lg">{user?.name?.[0]}</AvatarFallback>
        </Avatar>
        <div className="flex flex-col gap-2">
          <h2>{user?.displayName}</h2>
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
        </div>
      </div>
      <Tabs defaultValue="decks" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="decks">Decks</TabsTrigger>
          <TabsTrigger value="collections">Collections</TabsTrigger>
          <TabsTrigger value="wantlists">Wantlists</TabsTrigger>
        </TabsList>
        <TabsContent value="decks">
          <UserDecks userId={userId} />
        </TabsContent>
        <TabsContent value="collections">
          <UserCollections userId={userId} collectionType={CollectionType.COLLECTION} />
        </TabsContent>
        <TabsContent value="wantlists">
          <UserCollections userId={userId} collectionType={CollectionType.WANTLIST} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default UserDetail;
