import { Link } from '@tanstack/react-router';
import { Play } from 'lucide-react';
import { Button } from '@/components/ui/button.tsx';

export function ReplayButton({
  lobbyId,
  label = 'Replay',
  compact = false,
  iconOnly = false,
}: {
  lobbyId: string;
  label?: string;
  compact?: boolean;
  iconOnly?: boolean;
}) {
  return (
    <Button
      size={iconOnly ? 'iconSmall' : 'xs'}
      variant={iconOnly ? 'ghost' : 'secondary'}
      asChild
      className={!iconOnly && compact ? '@max-[440px]:size-8 @max-[440px]:p-0' : undefined}
    >
      <Link
        to="/crossfire/replay/$lobbyId"
        params={{ lobbyId }}
        title={iconOnly ? label : undefined}
        aria-label={iconOnly ? label : undefined}
      >
        <Play aria-hidden="true" />
        {!iconOnly && <span className={compact ? '@max-[440px]:sr-only' : undefined}>{label}</span>}
      </Link>
    </Button>
  );
}
