import { useGetUserCollections } from '@/api/useGetUserCollections.ts';
import CollectionTable from '../CollectionCardTable/CollectionTable';

interface UserCollectionsProps {
  userId: string | undefined;
  loading?: boolean;
}

const UserCollections: React.FC<UserCollectionsProps> = ({ userId, loading = false }) => {
  const { data, isFetching } = useGetUserCollections(userId);

  const load = isFetching || loading;

  return <CollectionTable collections={data?.collections ?? []} loading={load} />;
};

export default UserCollections;
