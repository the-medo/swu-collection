import { ArrowLeft, ArrowRight, Pencil, Star, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button.tsx';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip.tsx';
import { cn } from '@/lib/utils.ts';

export function AlbumImageActions({
  index,
  total,
  cover,
  disabled,
  onMove,
  onEdit,
  onCover,
  onRemove,
}: {
  index: number;
  total: number;
  cover: boolean;
  disabled: boolean;
  onMove(direction: 'earlier' | 'later'): void;
  onEdit(): void;
  onCover(): void;
  onRemove(): void;
}) {
  const actions = [
    {
      label: `Move image ${index + 1} earlier`,
      hint: 'Move earlier',
      icon: ArrowLeft,
      disabled: disabled || index === 0,
      run: () => onMove('earlier'),
    },
    {
      label: `Move image ${index + 1} later`,
      hint: 'Move later',
      icon: ArrowRight,
      disabled: disabled || index === total - 1,
      run: () => onMove('later'),
    },
    { label: 'Edit details', hint: 'Caption & alt text', icon: Pencil, disabled, run: onEdit },
    {
      label: cover ? 'Cover image' : 'Set as cover',
      hint: cover ? 'Album cover' : 'Make album cover',
      icon: Star,
      disabled: disabled || cover,
      run: onCover,
    },
    { label: 'Remove from album', hint: 'Remove image', icon: Trash2, disabled, run: onRemove },
  ];
  return (
    <div
      className="flex items-center justify-between gap-1"
      role="group"
      aria-label={`Image ${index + 1} actions`}
    >
      {actions.map(({ label, hint, icon: Icon, disabled: unavailable, run }, i) => (
        <Tooltip key={hint}>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              disabled={unavailable}
              aria-label={label}
              onClick={run}
              className={cn(
                'size-9 rounded-lg text-muted-foreground hover:bg-[var(--album-tint)] hover:text-[var(--album-accent)]',
                i === 2 && 'ml-auto',
                i === 3 && cover && 'text-[var(--album-accent)] disabled:opacity-100',
                i === 4 && 'hover:bg-destructive/10 hover:text-destructive',
              )}
            >
              <Icon className={cn(i === 3 && cover && 'fill-current')} strokeWidth={1.6} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{hint}</TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
}
