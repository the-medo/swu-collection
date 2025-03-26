import { useGetUserCollections } from '@/api/user/useGetUserCollections.ts';
import CollectionTable from '../CollectionCardTable/CollectionTable';
import { useMemo } from 'react';
import { useGetUser } from '@/api/user/useGetUser.ts';
import { UserCollectionData } from '@/components/app/collections/CollectionCardTable/collectionTableLib.tsx';
import { CollectionType } from '../../../../../../types/enums.ts';

interface UserCollectionsProps {
  userId: string | undefined;
  loading?: boolean;
  collectionType: CollectionType;
}

const UserCollections: React.FC<UserCollectionsProps> = ({
  userId,
  loading = false,
  collectionType,
}) => {
  const { data: user, isFetching: isFetchingUser } = useGetUser(userId);
  const { data, isFetching } = useGetUserCollections(userId);

  const load = isFetching || loading || isFetchingUser;

  const collections: UserCollectionData[] = useMemo(() => {
    if (user && data) {
      return data.collections
        .filter(c => c.collectionType === collectionType)
        .map(c => ({
          collection: c,
          user,
        }));
    }
    return [];
  }, [user, data, collectionType]);

  return <CollectionTable variant="user" collections={collections} loading={load} />;
};

export default UserCollections;
