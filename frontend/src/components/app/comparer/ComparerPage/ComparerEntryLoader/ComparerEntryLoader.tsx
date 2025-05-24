import { useComparerStore } from '@/components/app/comparer/useComparerStore.ts';
import * as React from 'react';
import ComparerEntryDeckLoader from '@/components/app/comparer/ComparerPage/ComparerEntryLoader/ComparerEntryDeckLoader.tsx';
import ComparerEntryCollectionLoader from '@/components/app/comparer/ComparerPage/ComparerEntryLoader/ComparerEntryCollectionLoader.tsx';

interface ComparerEntryLoaderProps {
  entry: ReturnType<typeof useComparerStore>['entries'][number];
}

const ComparerEntryLoader: React.FC<ComparerEntryLoaderProps> = ({ entry }) => {
  if (entry.dataType === 'deck') {
    return <ComparerEntryDeckLoader deckId={entry.id} />;
  }
  return <ComparerEntryCollectionLoader collectionId={entry.id} />;
};

export default ComparerEntryLoader;
