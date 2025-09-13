import { Badge } from '@/components/ui/badge.tsx';
import { Book } from 'lucide-react';
import { cn } from '@/lib/utils.ts';

export const forDecksRenderer = (value: boolean, onClick?: () => void) =>
  value ? (
    <Badge onClick={onClick} className={cn('flex gap-1', { 'cursor-pointer': !!onClick })}>
      <Book className="size-3" /> For decks
    </Badge>
  ) : (
    <Badge
      variant="outline"
      className={cn('flex gap-1', { 'cursor-pointer': !!onClick })}
      onClick={onClick}
    >
      <Book className="size-3" />
      Not for decks
    </Badge>
  );
