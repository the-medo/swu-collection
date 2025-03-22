import { Badge } from '@/components/ui/badge.tsx';

export const publicRenderer = (value: boolean, onClick?: () => void) =>
  value ? (
    <Badge onClick={onClick}>Public</Badge>
  ) : (
    <Badge variant="outline" onClick={onClick}>
      Private
    </Badge>
  );
