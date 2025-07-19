import React from 'react';
import { useCCDetail } from '@/components/app/collections/CollectionContents/CollectionGroups/useCollectionGroupStore.ts';
import { languageRenderer } from '@/lib/table/languageRenderer.tsx';
import { Skeleton } from '@/components/ui/skeleton.tsx';
import { CardLanguage } from '../../../../../../../../types/enums.ts';

interface LanguageCellProps {
  cardKey: string;
}

const LanguageCell: React.FC<LanguageCellProps> = ({ cardKey }) => {
  const collectionCard = useCCDetail(cardKey);
  return collectionCard ? (
    languageRenderer(collectionCard.language as CardLanguage)
  ) : (
    <Skeleton className="w-8 h-4 rounded-md" />
  );
};

export default LanguageCell;
