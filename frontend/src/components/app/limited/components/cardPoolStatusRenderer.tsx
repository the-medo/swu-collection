import { Badge } from '@/components/ui/badge.tsx';
import { cn } from '@/lib/utils.ts';
import { Clock } from 'lucide-react';

export type PoolStatus = 'in_progress' | 'ready';

export const cardPoolStatusRenderer = (value: PoolStatus) =>
  value === 'ready' ? null : (
    <Badge variant="outline" className={cn('flex gap-1')}>
      <Clock className="size-3" /> Needs import
    </Badge>
  );
