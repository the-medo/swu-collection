import React from 'react';
import { useCCDetail } from '@/components/app/collections/CollectionContents/CollectionGroups/useCollectionGroupStore.ts';
import { languageRenderer } from '@/lib/table/languageRenderer.tsx';
import { CardLanguage } from '../../../../../../../types/enums.ts';

interface LanguageCellProps {
  cardKey: string;
}

const LanguageCell: React.FC<LanguageCellProps> = ({ cardKey }) => {
  const collectionCard = useCCDetail(cardKey);
  return languageRenderer(collectionCard.language as CardLanguage);
};

export default LanguageCell;