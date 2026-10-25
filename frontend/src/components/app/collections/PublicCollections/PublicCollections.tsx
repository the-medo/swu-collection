import { browseStyles } from '@/components/app/global/BrowsePage/browseStyles';
import { cn } from '@/lib/utils';
import CollectionTable from '../CollectionCardTable/CollectionTable';
import { useMemo } from 'react';
import { UserCollectionData } from '@/components/app/collections/CollectionCardTable/collectionTableLib.tsx';
import { useGetCollections } from '@/api/collections/useGetCollections.ts';
import { usePublicCollectionsStore } from '@/components/app/collections/PublicCollections/usePublicCollectionsStore.ts';
import CountryAndStateSelectors from '@/components/app/collections/PublicCollections/CountryAndStateSelectors.tsx';
import { CollectionType } from '../../../../../../types/enums.ts';
import { Button } from '@/components/ui/button.tsx';
import { BrowseEmpty } from '@/components/app/global/BrowsePage/BrowsePage.tsx';
import { CollectionIcon, WantlistIcon } from '@/components/app/global/icons/CardLibraryIcons.tsx';

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

  const { data, isFetching, isError, refetch } = useGetCollections(params);

  const load = isFetching && !data;

  const collections: UserCollectionData[] = useMemo(() => {
    if (data) {
      return data.pages.flat();
    }
    return [];
  }, [data]);

  return (
    <>
      <CountryAndStateSelectors />
      {isError ? (
        <div role="alert" className={cn('flex flex-wrap items-center gap-4', browseStyles.panel)}>
          Could not load the lists.
          <Button variant="outline" onClick={() => void refetch()}>
            Try again
          </Button>
        </div>
      ) : !load && collections.length === 0 ? (
        <BrowseEmpty
          icon={collectionType === CollectionType.WANTLIST ? WantlistIcon : CollectionIcon}
          title="No lists found here yet"
        >
          Try another location or clear the filters to explore the community.
        </BrowseEmpty>
      ) : (
        <CollectionTable
          variant="public"
          collections={collections}
          loading={load}
          collectionType={collectionType}
        />
      )}
    </>
  );
};

export default PublicCollections;
