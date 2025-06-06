import { useGetCollection } from '@/api/collections/useGetCollection.ts';
import { getRouteApi, Link } from '@tanstack/react-router';
import { useUser } from '@/hooks/useUser';
import LoadingTitle from '../../global/LoadingTitle';
import CollectionInputSection from '@/components/app/collections/CollectionInput/CollectionInputSection.tsx';
import CollectionContents from '@/components/app/collections/CollectionContents/CollectionContents.tsx';
import { useEffect } from 'react';
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

const routeApi = getRouteApi('/collections/$collectionId/');

const CollectionDetail: React.FC = () => {
  const user = useUser();
  const { collectionId } = routeApi.useParams();
  const { data, isFetching, error } = useGetCollection(collectionId);
  const { setCollectionInfo } = useCollectionLayoutStoreActions();

  const collectionUserId = data?.user?.id ?? '';
  const collectionCurrency = data?.user.currency;
  const loading = isFetching;
  const owned = user?.id === collectionUserId;

  const collectionType = data?.collection.collectionType ?? CollectionType.COLLECTION;
  const cardListString = collectionTypeTitle[collectionType];

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
      <Helmet title={data?.collection.title ? `${data.collection.title} | ${cardListString} | SWUBase` : `Loading ${cardListString} | SWUBase`} />
      <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
        <LoadingTitle
          mainTitle={data?.collection.title}
          subTitle={
            <>
              {cardListString.toLowerCase()} by{' '}
              <Link to={`/users/$userId`} params={{ userId: collectionUserId }}>
                {data?.user.displayName}
              </Link>
            </>
          }
          loading={loading}
        />
        {owned && data?.collection && (
          <div className="flex flex-row gap-4 items-center">
            {publicRenderer(data?.collection.public)}
            <EditCollectionDialog
              collection={data?.collection}
              trigger={<Button>Edit {cardListString}</Button>}
            />
            <DeleteCollectionDialog
              collection={data?.collection}
              trigger={<Button variant="destructive">Delete {cardListString}</Button>}
            />
          </div>
        )}
      </div>
      <div className="flex flex-row gap-4 text-sm italic mb-2">{data?.collection.description}</div>
      <div className="flex flex-col-reverse lg:flex-row gap-4">
        <CollectionContents collectionId={collectionId} />
        <div className="flex flex-col gap-4 w-full lg:w-[400px]">
          <CollectionActions collectionId={collectionId} />
          <CollectionStats collectionId={collectionId} />
          {owned && <CollectionInputSection collectionId={collectionId} />}
        </div>
      </div>
    </>
  );
};

export default CollectionDetail;
