import { Badge } from '@/components/ui/badge.tsx';

export const publicRenderer = (value: boolean) =>
  value ? <Badge>Public</Badge> : <Badge variant="outline">Private</Badge>;
