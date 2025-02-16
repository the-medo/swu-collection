import CollectionTable from '../CollectionCardTable/CollectionTable';
import { useMemo } from 'react';
import { UserCollectionData } from '@/components/app/collections/CollectionCardTable/collectionTableLib.tsx';
import { useGetCollections } from '@/api/useGetCollections.ts';

interface PublicCollectionsProps {}

const PublicCollections: React.FC<PublicCollectionsProps> = ({}) => {
  const { data, isFetching } = useGetCollections();

  const load = isFetching;

  const collections: UserCollectionData[] = useMemo(() => {
    if (data) {
      return data.pages.flat();
    }
    return [];
  }, [data]);

  return <CollectionTable variant="public" collections={collections} loading={load} />;
};

export default PublicCollections;
