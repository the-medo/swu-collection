import * as React from 'react';
import { Badge } from '@/components/ui/badge';
import { BookOpenCheck, NotebookTabs, ScrollText } from 'lucide-react';
import { useComparerStore } from '@/components/app/comparer/useComparerStore';
import { CollectionType } from '../../../../../../types/enums';

interface ItemTypeBadgeProps {
  entry: ReturnType<typeof useComparerStore>['entries'][number];
}

/**
 * Renders a badge indicating the type of the comparer entry
 */
const ItemTypeBadge: React.FC<ItemTypeBadgeProps> = ({ entry }) => {
  // If it's a deck, return a deck badge
  if (entry.dataType === 'deck') {
    return (
      <Badge className="bg-green-200">
        <NotebookTabs className="mr-1 h-3 w-3" />
        Deck
      </Badge>
    );
  }

  // Otherwise, render collection type badge
  switch (entry.collectionType) {
    case CollectionType.COLLECTION:
      return (
        <Badge className="bg-blue-200">
          <BookOpenCheck className="mr-1 h-3 w-3" />
          Collection
        </Badge>
      );
    case CollectionType.WANTLIST:
      return (
        <Badge className="bg-amber-200">
          <ScrollText className="mr-1 h-3 w-3" />
          Wantlist
        </Badge>
      );
    case CollectionType.OTHER:
      return (
        <Badge className="bg-gray-200">
          <NotebookTabs className="mr-1 h-3 w-3" />
          Other
        </Badge>
      );
    default:
      return (
        <Badge className="bg-blue-200">
          <BookOpenCheck className="mr-1 h-3 w-3" />
          Collection
        </Badge>
      );
  }
};

export default ItemTypeBadge;