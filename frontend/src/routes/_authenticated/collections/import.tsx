import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import CollectionImportPage from '@/components/app/collections/CollectionImport/CollectionImportPage.tsx';

export const Route = createFileRoute('/_authenticated/collections/import')({
  validateSearch: z.object({ collectionId: z.guid().optional().catch(undefined) }),
  component: ImportRoute,
});
function ImportRoute() {
  const { collectionId } = Route.useSearch();
  return <CollectionImportPage key={collectionId ?? 'new'} collectionId={collectionId} />;
}
