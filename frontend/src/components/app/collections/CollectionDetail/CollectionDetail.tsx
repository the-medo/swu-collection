import { browseStyles } from '@/components/app/global/BrowsePage/browseStyles';
import { useGetCollection } from '@/api/collections/useGetCollection.ts';
import { getRouteApi } from '@tanstack/react-router';
import { UserDisplay } from '@/components/app/global/UserDisplay.tsx';
import { useUser } from '@/hooks/useUser';
import { BrowseHeader, BrowsePage } from '@/components/app/global/BrowsePage/BrowsePage.tsx';
import {
  CollectionIcon,
  WantlistIcon,
  CardListIcon,
} from '@/components/app/global/icons/CardLibraryIcons.tsx';
import CollectionInputSection from '@/components/app/collections/CollectionInput/CollectionInputSection.tsx';
import CollectionContents from '@/components/app/collections/CollectionContents/CollectionContents.tsx';
import { useCallback, useEffect } from 'react';
import { useCollectionLayoutStoreActions } from '@/components/app/collections/CollectionContents/CollectionSettings/useCollectionLayoutStore.ts';
import EditCollectionDialog from '@/components/app/dialogs/EditCollectionDialog.tsx';
import { Button } from '@/components/ui/button.tsx';
import { publicRenderer } from '@/lib/table/publicRenderer.tsx';
import DeleteCollectionDialog from '@/components/app/dialogs/DeleteCollectionDialog.tsx';
import Error404 from '@/components/app/pages/error/Error404.tsx';
import CollectionStats from '@/components/app/collections/CollectionStats/CollectionStats.tsx';
import CollectionActions from '@/components/app/collections/CollectionActions/CollectionActions.tsx';
import { collectionTypeTitle } from '../../../../../../types/iterableEnumInfo.ts';
import { CollectionType } from '../../../../../../types/enums.ts';
import { Helmet } from 'react-helmet-async';
import { forSaleRenderer } from '@/lib/table/forSaleRenderer.tsx';
import { forDecksRenderer } from '@/lib/table/forDecksRenderer.tsx';
import { usePutCollection } from '@/api/collections/usePutCollection.ts';
import CollectionCardSelection from '@/components/app/collections/CollectionCardSelection/CollectionCardSelection.tsx';
import CollectionSources from '@/components/app/collections/CollectionSources/CollectionSources.tsx';
import CollectionPricing from '@/components/app/collections/CollectionPricing/CollectionPricing.tsx';
import { useSidebar } from '@/components/ui/sidebar.tsx';

const routeApi = getRouteApi('/collections/$collectionId/');

const CollectionDetail: React.FC = () => {
  const { isMobile } = useSidebar();
  const user = useUser();
  const { collectionId } = routeApi.useParams();
  const { data, isFetching, error } = useGetCollection(collectionId);
  const { setCollectionInfo } = useCollectionLayoutStoreActions();
  const putCollectionMutation = usePutCollection();

  const collectionUserId = data?.user?.id ?? '';
  const collectionCurrency = data?.user?.currency;
  const loading = isFetching;
  const owned = user?.id === collectionUserId;

  const type = data?.collection.collectionType;
  const publicC = !!data?.collection.public;
  const forSaleC = !!data?.collection.forSale;
  const forDecksC = !!data?.collection.forDecks;

  const collectionType = data?.collection.collectionType ?? CollectionType.COLLECTION;
  const cardListString = collectionTypeTitle[collectionType];

  const toggleValue = useCallback((fieldName: string, value: boolean) => {
    if (!['public', 'forDecks', 'forSale'].includes(fieldName)) return;
    putCollectionMutation.mutate({
      collectionId: collectionId,
      [fieldName]: value,
    });
  }, []);

  const togglePublic = () => toggleValue('public', !publicC);
  const toggleForSale = () => toggleValue('forSale', !forSaleC);
  const toggleForDecks = () => toggleValue('forDecks', !forDecksC);

  useEffect(() => {
    setCollectionInfo(
      collectionId,
      collectionCurrency ?? '-',
      owned,
      collectionType,
      cardListString,
    );
  }, [owned, collectionCurrency, collectionType, cardListString]);

  if (error?.status === 404) {
    return (
      <>
        <Helmet title={`${cardListString} not found | SWUBase`} />
        <Error404
          title={`${cardListString} not found`}
          description={`The ${cardListString} you are looking for does not exist. It is possible that it was deleted or it is not public.`}
        />
      </>
    );
  }

  return (
    <>
      <Helmet
        title={
          data?.collection.title
            ? `${data.collection.title} | ${cardListString} | SWUBase`
            : `Loading ${cardListString} | SWUBase`
        }
      />
      <BrowsePage>
        <BrowseHeader
          eyebrow={cardListString}
          icon={
            collectionType === CollectionType.WANTLIST
              ? WantlistIcon
              : collectionType === CollectionType.OTHER
                ? CardListIcon
                : CollectionIcon
          }
          title={data?.collection.title ?? `Loading ${cardListString.toLowerCase()}…`}
          description={
            <span className="inline-flex max-w-full flex-wrap items-center gap-2">
              <span>Curated by</span>
              {data?.user && <UserDisplay user={data.user} size="md" />}
            </span>
          }
        >
          {owned && data?.collection && (
            <div className="flex flex-wrap gap-2 items-center">
              {publicRenderer(data?.collection.public, owned ? togglePublic : undefined)}
              {type === CollectionType.COLLECTION
                ? forSaleRenderer(data?.collection.forSale, owned ? toggleForSale : undefined)
                : null}
              {type === CollectionType.COLLECTION
                ? forDecksRenderer(data?.collection.forDecks, owned ? toggleForDecks : undefined)
                : null}
              <EditCollectionDialog
                collection={data?.collection}
                trigger={<Button>Edit {cardListString}</Button>}
              />
              <DeleteCollectionDialog
                collection={data?.collection}
                trigger={
                  <Button variant="outline" className="text-destructive">
                    Delete {cardListString}
                  </Button>
                }
              />
            </div>
          )}
        </BrowseHeader>
        {data?.collection.description && (
          <p className="m-0 max-w-3xl text-sm leading-relaxed text-muted-foreground [overflow-wrap:anywhere]">
            {data.collection.description}
          </p>
        )}
        <CollectionActions collectionId={collectionId} />
        <div className={browseStyles.collectionDetailLayout} aria-busy={loading}>
          <CollectionContents collectionId={collectionId} />
          <details open={!isMobile} className={browseStyles.collectionToolsDisclosure}>
            <summary className="cursor-pointer rounded-2xl border border-[var(--browse-border)] bg-[var(--browse-soft)] px-5 py-4 text-sm font-medium text-[var(--browse-accent)] lg:hidden">
              {owned ? 'Add cards & collection tools' : 'Summary, card selection & tools'}
            </summary>
            <div className={browseStyles.collectionDetailTools}>
              <CollectionPricing collectionId={collectionId} showReloadButtonWhenNoPrices={true} />
              <CollectionStats collectionId={collectionId} />
              {user && <CollectionSources collectionId={collectionId} owned={owned} />}
              {!owned && <CollectionCardSelection collectionId={collectionId} />}
              {owned && <CollectionInputSection collectionId={collectionId} />}
            </div>
          </details>
        </div>
      </BrowsePage>
    </>
  );
};

export default CollectionDetail;
