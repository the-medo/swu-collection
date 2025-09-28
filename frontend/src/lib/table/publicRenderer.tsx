import { Badge } from '@/components/ui/badge.tsx';
import { cn } from '@/lib/utils.ts';

export const publicRenderer = (value: boolean, onClick?: () => void) =>
  value ? (
    <Badge onClick={onClick} className={cn({ 'cursor-pointer': !!onClick })}>
      Public
    </Badge>
  ) : (
    <Badge variant="outline" className={cn({ 'cursor-pointer': !!onClick })} onClick={onClick}>
      Private
    </Badge>
  );
