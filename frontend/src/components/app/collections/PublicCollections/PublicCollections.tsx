import CollectionTable from '../CollectionCardTable/CollectionTable';
import { useMemo } from 'react';
import { UserCollectionData } from '@/components/app/collections/CollectionCardTable/collectionTableLib.tsx';
import { useGetCollections } from '@/api/collections/useGetCollections.ts';
import { usePublicCollectionsStore } from '@/components/app/collections/PublicCollections/usePublicCollectionsStore.ts';
import CountryAndStateSelectors from '@/components/app/collections/PublicCollections/CountryAndStateSelectors.tsx';
import { CollectionType } from '../../../../../../types/enums.ts';

interface PublicCollectionsProps {
  collectionType: CollectionType;
}

const PublicCollections: React.FC<PublicCollectionsProps> = ({ collectionType }) => {
  const { country, state } = usePublicCollectionsStore();

  const params = useMemo(
    () => ({
      collectionType,
      country: country ?? undefined,
      state: state ?? undefined,
    }),
    [collectionType, country, state],
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
      <CollectionTable
        variant="public"
        collections={collections}
        loading={load}
        collectionType={collectionType}
      />
      <CountryAndStateSelectors />
    </>
  );
};

export default PublicCollections;
