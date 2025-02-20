import CollectionTable from '../CollectionCardTable/CollectionTable';
import { useMemo } from 'react';
import { UserCollectionData } from '@/components/app/collections/CollectionCardTable/collectionTableLib.tsx';
import { useGetCollections } from '@/api/useGetCollections.ts';
import { usePublicCollectionsStore } from '@/components/app/collections/PublicCollections/usePublicCollectionsStore.ts';
import CountryAndStateSelectors from '@/components/app/collections/PublicCollections/CountryAndStateSelectors.tsx';

interface PublicCollectionsProps {}

const PublicCollections: React.FC<PublicCollectionsProps> = () => {
  const { country, state } = usePublicCollectionsStore();

  const params = useMemo(
    () => ({
      wantlist: false,
      country: country ?? undefined,
      state: state ?? undefined,
    }),
    [country, state],
  );

  const { data, isFetching } = useGetCollections(params);

  const load = isFetching;

  const collections: UserCollectionData[] = useMemo(() => {
    if (data) {
      return data.pages.flat();
    }
    return [];
  }, [data]);

  return (
    <>
      <CollectionTable variant="public" collections={collections} loading={load} />
      <CountryAndStateSelectors />
    </>
  );
};

export default PublicCollections;
