import { Badge } from '@/components/ui/badge.tsx';
import { cn } from '@/lib/utils.ts';

export const deckPrivacyRenderer = (value: number, onClick?: () => void) => {
  const commonProps = {
    className: cn({ 'cursor-pointer': !!onClick }),
    onClick,
  } as const;

  switch (value) {
    case 1:
      return <Badge {...commonProps}>Public</Badge>;
    case 2:
      return (
        <Badge variant="secondary" {...commonProps}>
          Unlisted
        </Badge>
      );
    case 0:
    default:
      return (
        <Badge variant="outline" {...commonProps}>
          Private
        </Badge>
      );
  }
};
