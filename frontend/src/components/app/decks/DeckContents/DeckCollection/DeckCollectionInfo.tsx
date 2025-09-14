import * as React from 'react';
import { useDeckCollection } from '@/components/app/decks/DeckContents/DeckCollection/useDeckCollection.ts';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils.ts';

interface DeckCollectionInfoProps {
  deckId: string;
}

const DeckCollectionInfo: React.FC<DeckCollectionInfoProps> = ({ deckId }) => {
  const { data: d, isLoading } = useDeckCollection(deckId);

  if (isLoading) {
    return <Loader2 className="mr-2 h-4 w-4 animate-spin" />;
  }

  const total = d?.total ?? 0;
  const owned = total - (d?.missingTotal ?? 0);

  return (
    <span
      className={cn('font-semibold text-[11px]', {
        'text-red-500': owned < total,
      })}
    >
      ({owned}/{total})
    </span>
  );
};

export default DeckCollectionInfo;
