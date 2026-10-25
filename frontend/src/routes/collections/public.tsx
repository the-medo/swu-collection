import { createFileRoute } from '@tanstack/react-router';
import CollectionBrowsePage from '@/components/app/collections/CollectionBrowsePage.tsx';
import { CollectionType } from '../../../../types/enums.ts';

export const Route = createFileRoute('/collections/public')({
  component: () => (
    <CollectionBrowsePage collectionType={CollectionType.COLLECTION} scope="public" />
  ),
});
