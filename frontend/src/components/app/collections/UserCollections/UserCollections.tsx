import { browseStyles } from '@/components/app/global/BrowsePage/browseStyles';
import { cn } from '@/lib/utils';
import { useGetUserCollections } from '@/api/user/useGetUserCollections.ts';
import CollectionTable from '../CollectionCardTable/CollectionTable';
import { useMemo } from 'react';
import { useGetUser } from '@/api/user/useGetUser.ts';
import { UserCollectionData } from '@/components/app/collections/CollectionCardTable/collectionTableLib.tsx';
import { CollectionType } from '../../../../../../types/enums.ts';
import { BrowseEmpty } from '@/components/app/global/BrowsePage/BrowsePage.tsx';
import {
  CollectionIcon,
  WantlistIcon,
  CardListIcon,
} from '@/components/app/global/icons/CardLibraryIcons.tsx';
import { Button } from '@/components/ui/button.tsx';

interface UserCollectionsProps {
  userId: string | undefined;
  loading?: boolean;
  collectionType: CollectionType;
  includeEntityPrices?: boolean;
  browse?: boolean;
}

const UserCollections: React.FC<UserCollectionsProps> = ({
  userId,
  loading = false,
  collectionType,
  includeEntityPrices = false,
  browse = false,
}) => {
  const {
    data: user,
    isFetching: isFetchingUser,
    isError: userError,
    refetch: refetchUser,
  } = useGetUser(userId);
  const { data, isFetching, isError, refetch } = useGetUserCollections(userId, includeEntityPrices);

  const load = isFetching || loading || isFetchingUser;

  const collections: UserCollectionData[] = useMemo(() => {
    if (user && data) {
      return data.collections
        .filter(c => c.collectionType === collectionType)
        .map(c => ({
          collection: c,
          user,
          entityPrices: (data.entityPrices ?? []).filter(ep => ep.entityId === c.id),
        }));
    }
    return [];
  }, [user, data, collectionType]);

  if (browse && (isError || userError))
    return (
      <div role="alert" className={cn('flex flex-wrap items-center gap-4', browseStyles.panel)}>
        Could not load your library.
        <Button
          variant="outline"
          onClick={() => {
            void refetchUser();
            void refetch();
          }}
        >
          Try again
        </Button>
      </div>
    );
  if (browse && !load && collections.length === 0)
    return (
      <BrowseEmpty
        icon={
          collectionType === CollectionType.WANTLIST
            ? WantlistIcon
            : collectionType === CollectionType.OTHER
              ? CardListIcon
              : CollectionIcon
        }
        title="Make room for your next find"
      >
        Create your first{' '}
        {collectionType === CollectionType.WANTLIST
          ? 'wantlist'
          : collectionType === CollectionType.OTHER
            ? 'card list'
            : 'collection'}{' '}
        using the button above.
      </BrowseEmpty>
    );

  return (
    <CollectionTable
      variant="user"
      collections={collections}
      loading={load}
      collectionType={collectionType}
      showCollectionPrice={includeEntityPrices}
    />
  );
};

export default UserCollections;
