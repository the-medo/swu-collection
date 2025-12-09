import { Badge } from '@/components/ui/badge.tsx';
import { cn } from '@/lib/utils.ts';
import { Wand2 } from 'lucide-react';

export const cardPoolCustomRenderer = (value: boolean) =>
  value ? (
    <Badge variant="outline" className={cn('flex gap-1')}>
      <Wand2 className="size-3" /> Custom
    </Badge>
  ) : null;
