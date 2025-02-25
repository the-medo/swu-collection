import { useGetUserCollections } from '@/api/useGetUserCollections.ts';
import CollectionTable from '../CollectionCardTable/CollectionTable';
import { useMemo } from 'react';
import { useGetUser } from '@/api/useGetUser.ts';
import { UserCollectionData } from '@/components/app/collections/CollectionCardTable/collectionTableLib.tsx';

interface UserCollectionsProps {
  userId: string | undefined;
  loading?: boolean;
  wantlist?: boolean;
}

const UserCollections: React.FC<UserCollectionsProps> = ({
  userId,
  loading = false,
  wantlist = false,
}) => {
  const { data: user, isFetching: isFetchingUser } = useGetUser(userId);
  const { data, isFetching } = useGetUserCollections(userId);

  const load = isFetching || loading || isFetchingUser;

  const collections: UserCollectionData[] = useMemo(() => {
    if (user && data) {
      return data.collections
        .filter(c => c.wantlist === wantlist)
        .map(c => ({
          collection: c,
          user,
        }));
    }
    return [];
  }, [user, data, wantlist]);

  return <CollectionTable variant="user" collections={collections} loading={load} />;
};

export default UserCollections;
