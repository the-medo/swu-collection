import { useEffect, useId, useState } from 'react';
import { Globe2, Link2, Loader2, LockKeyhole } from 'lucide-react';
import { useAlbumMutation } from '@/api/user-albums/useAlbumMutation.ts';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select.tsx';
import { cn } from '@/lib/utils.ts';
import type { AlbumVisibility, UserAlbum } from '../../../../../types/UserAlbum.ts';

const privacyOptions = {
  private: { label: 'Private', icon: LockKeyhole, description: 'Only you can view this album.' },
  unlisted: {
    label: 'Unlisted',
    icon: Link2,
    description: 'Anyone with the link can view this album.',
  },
  public: {
    label: 'Public',
    icon: Globe2,
    description: 'Visible to everyone and listed on your profile.',
  },
};

export function AlbumPrivacyControl({
  album,
  disabled = false,
  onBusy,
  hero = false,
}: {
  album: UserAlbum;
  disabled?: boolean;
  onBusy?: (busy: boolean) => void;
  hero?: boolean;
}) {
  const id = useId();
  const mutation = useAlbumMutation();
  const [open, setOpen] = useState(false);
  // Keep the trigger focusable during saves; guarded handlers enforce its disabled state.
  const locked = disabled || mutation.isPending;
  const option = privacyOptions[album.visibility];
  const Icon = mutation.isPending ? Loader2 : option.icon;
  useEffect(() => {
    onBusy?.(mutation.isPending);
    return () => onBusy?.(false);
  }, [mutation.isPending, onBusy]);
  return (
    <div className="min-w-0 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <label
          htmlFor={id}
          className={cn(
            'text-xs font-medium',
            hero ? 'text-[#fffaf0]/75' : 'text-muted-foreground',
          )}
        >
          Privacy
        </label>
        <Select
          value={album.visibility}
          open={open}
          onOpenChange={next => {
            if (!next || !locked) setOpen(next);
          }}
          onValueChange={value => {
            // Radix also emits changes for typeahead on the closed trigger.
            if (locked || !open || value === album.visibility) return;
            mutation.mutate({
              action: 'update',
              id: album.id,
              input: { revision: album.revision, visibility: value as AlbumVisibility },
            });
          }}
        >
          <SelectTrigger
            id={id}
            aria-label={`Privacy for ${album.title}`}
            aria-describedby={`${id}-description`}
            aria-disabled={locked}
            aria-busy={mutation.isPending}
            className={cn(
              'h-9 w-auto gap-2 rounded-xl text-xs font-semibold focus:ring-offset-0 aria-disabled:opacity-60',
              hero
                ? 'border-white/20 bg-white/5 text-[#fffaf0] hover:bg-white/10'
                : 'border-[var(--album-border)] bg-[var(--album-tint)] text-[var(--album-accent)] hover:border-[var(--album-accent)]',
            )}
          >
            <Icon
              aria-hidden="true"
              className={cn('size-3.5', mutation.isPending && 'animate-spin')}
            />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(privacyOptions).map(([value, details]) => (
              <SelectItem key={value} value={value}>
                {details.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {mutation.isPending && (
          <span role="status" className="text-xs">
            Saving…
          </span>
        )}
      </div>
      <p
        id={`${id}-description`}
        className={cn(
          'text-[11px] leading-relaxed',
          hero ? 'text-[#fffaf0]/65' : 'text-muted-foreground',
        )}
      >
        {option.description}
        {album.tournament &&
          ` Choosing Private or Unlisted will also unlink this album from ${album.tournament.name}.`}
      </p>
      {mutation.isError && (
        <p
          role="alert"
          className={cn('text-xs', hero ? 'text-red-200' : 'text-red-700 dark:text-red-300')}
        >
          {'status' in mutation.error && mutation.error.status === 409
            ? 'This album has changed. Check the current privacy setting and choose again to retry.'
            : `${mutation.error.message} Choose a privacy setting to retry.`}
        </p>
      )}
    </div>
  );
}
