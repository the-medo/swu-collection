import * as React from 'react';
import { useGetCollection } from '@/api/collections/useGetCollection.ts';

interface ComparerEntryCollectionLoaderProps {
  collectionId: string;
}

const ComparerEntryCollectionLoader: React.FC<ComparerEntryCollectionLoaderProps> = ({
  collectionId,
}) => {
  useGetCollection(collectionId);

  return null;
};

export default ComparerEntryCollectionLoader;
