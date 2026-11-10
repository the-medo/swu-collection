import { createFileRoute } from '@tanstack/react-router';
import CollectionImportReviewPage from '@/components/app/collections/CollectionImport/CollectionImportReviewPage.tsx';

export const Route = createFileRoute('/_authenticated/collections/$collectionId/imports/$importId')(
  {
    component: ImportReviewRoute,
  },
);
function ImportReviewRoute() {
  const { collectionId, importId } = Route.useParams();
  return (
    <CollectionImportReviewPage key={importId} collectionId={collectionId} importId={importId} />
  );
}
