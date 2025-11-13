import { Badge } from '@/components/ui/badge.tsx';
import { cn } from '@/lib/utils.ts';
import { CardPoolType } from '../../../../../../shared/types/cardPools.ts';

export const cardPoolTypeRenderer = (value: CardPoolType) => {
  switch (value) {
    case 'prerelease':
      return (
        <Badge variant="outline" className={cn('flex gap-1')}>
          Prerelease
        </Badge>
      );
    case 'sealed':
      return (
        <Badge variant="outline" className={cn('flex gap-1')}>
          Sealed deck
        </Badge>
      );
    case 'draft':
    default:
      return (
        <Badge variant="outline" className={cn('flex gap-1')}>
          Draft
        </Badge>
      );
  }
};
