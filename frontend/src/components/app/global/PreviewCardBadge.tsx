import { Badge } from '@/components/ui/badge.tsx';
import { cn } from '@/lib/utils.ts';

type PreviewCardBadgeProps = {
  className?: string;
  size?: 'default' | 'small';
};

function PreviewCardBadge({ className, size = 'small' }: PreviewCardBadgeProps) {
  return (
    <Badge variant="warning" size={size} className={cn('shrink-0 not-italic', className)}>
      Preview
    </Badge>
  );
}

export default PreviewCardBadge;
