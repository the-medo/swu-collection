import { Badge } from '@/components/ui/badge';
import type { ComparerEntry } from '@/components/app/comparer/useComparerStore';
import { CollectionType } from '../../../../../../types/enums';
import {
  CardListIcon,
  CollectionIcon,
  DeckIcon,
  WantlistIcon,
} from '@/components/app/global/icons/CardLibraryIcons.tsx';

export default function ItemTypeBadge({ entry }: { entry: ComparerEntry }) {
  const [Icon, label] =
    entry.dataType === 'deck'
      ? ([DeckIcon, 'Deck'] as const)
      : entry.collectionType === CollectionType.WANTLIST
        ? ([WantlistIcon, 'Wantlist'] as const)
        : entry.collectionType === CollectionType.OTHER
          ? ([CardListIcon, 'Card list'] as const)
          : ([CollectionIcon, 'Collection'] as const);
  return (
    <Badge
      variant="outline"
      className="gap-1 border-border bg-muted/40 font-normal text-foreground"
    >
      <Icon className="size-3" />
      {label}
    </Badge>
  );
}
