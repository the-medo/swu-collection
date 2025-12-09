import { Badge } from '@/components/ui/badge.tsx';
import { cn } from '@/lib/utils.ts';
import { Lock } from 'lucide-react';

export type Visibility = 'private' | 'unlisted' | 'public';

export const cardPoolVisibilityRenderer = (value: Visibility, onClick?: () => void) => {
  switch (value) {
    case 'private':
      return (
        <Badge
          variant="outline"
          className={cn('flex gap-1', { 'cursor-pointer': !!onClick })}
          onClick={onClick}
        >
          <Lock className="size-3" /> Private
        </Badge>
      );
    case 'unlisted':
      return (
        <Badge
          variant="outline"
          className={cn('flex gap-1', { 'cursor-pointer': !!onClick })}
          onClick={onClick}
        >
          Unlisted
        </Badge>
      );
    case 'public':
    default:
      return (
        <Badge
          variant="outline"
          className={cn('flex gap-1', { 'cursor-pointer': !!onClick })}
          onClick={onClick}
        >
          Public
        </Badge>
      );
  }
};
