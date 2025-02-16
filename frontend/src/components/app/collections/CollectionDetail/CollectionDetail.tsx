import { useGetCollection } from '@/api/useGetCollection.ts';
import { getRouteApi, Link } from '@tanstack/react-router';
import { useUser } from '@/hooks/useUser';
import LoadingTitle from '../../global/LoadingTitle';
import CollectionInputSection from '@/components/app/collections/CollectionInput/CollectionInputSection.tsx';
import CollectionContents from '@/components/app/collections/CollectionContents/CollectionContents.tsx';
import { useEffect } from 'react';
import { useCollectionLayoutStoreActions } from '@/components/app/collections/CollectionContents/CollectionLayoutSettings/useCollectionLayoutStore.ts';
import EditCollectionDialog from '@/components/app/dialogs/EditCollectionDialog.tsx';
import { Button } from '@/components/ui/button.tsx';
import { publicRenderer } from '@/lib/table/publicRenderer.tsx';
import DeleteCollectionDialog from '@/components/app/dialogs/DeleteCollectionDialog.tsx';
import Error404 from '@/components/app/pages/error/Error404.tsx';

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

  useEffect(() => {
    setCollectionInfo(collectionId, collectionCurrency ?? '-', false);
  }, [owned, collectionCurrency]);

  if (error?.status === 404) {
    return (
      <Error404
        title="Collection not found"
        description="The collection you are looking for does not exist. It is possible that it was deleted or it is not public."
      />
    );
  }

  return (
    <>
      <div className="flex flex-row gap-4 items-center justify-between">
        <LoadingTitle
          mainTitle={data?.collection.title}
          subTitle={
            <>
              collection by{' '}
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
              trigger={<Button>Edit collection</Button>}
            />
            <DeleteCollectionDialog
              collection={data?.collection}
              trigger={<Button variant="destructive">Delete collection</Button>}
            />
          </div>
        )}
      </div>
      <div className="flex flex-row gap-4 text-sm italic mb-2">{data?.collection.description}</div>
      <div className="flex flex-row gap-4">
        <CollectionContents collectionId={collectionId} />
        {owned && <CollectionInputSection collectionId={collectionId} />}
      </div>
    </>
  );
};

export default CollectionDetail;
