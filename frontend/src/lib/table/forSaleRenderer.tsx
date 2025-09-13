import { Badge } from '@/components/ui/badge.tsx';
import { Tag } from 'lucide-react';
import { cn } from '@/lib/utils.ts';

export const forSaleRenderer = (value: boolean, onClick?: () => void) =>
  value ? (
    <Badge onClick={onClick} className={cn('flex gap-1', { 'cursor-pointer': !!onClick })}>
      <Tag className="size-3" /> For sale
    </Badge>
  ) : (
    <Badge
      variant="outline"
      className={cn('flex gap-1', { 'cursor-pointer': !!onClick })}
      onClick={onClick}
    >
      <Tag className="size-3" />
      Not for sale
    </Badge>
  );
