import { useRef, useState, type RefObject } from 'react';
import { Images } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog.tsx';
import { albumTheme } from '@/components/app/user-albums/albumStyles.ts';
import { cn } from '@/lib/utils.ts';
import { TournamentAlbumBrowser } from './TournamentAlbumBrowser.tsx';

export function TournamentAlbumDialog({
  tournamentId,
  tournamentName,
  initialAlbumId,
  onClose,
  opener,
}: {
  tournamentId: string;
  tournamentName: string;
  initialAlbumId: string;
  onClose: () => void;
  opener: RefObject<HTMLButtonElement | null>;
}) {
  const [selectedAlbumId, setSelectedAlbumId] = useState(initialAlbumId);
  const title = useRef<HTMLHeadingElement>(null);
  return (
    <Dialog
      open
      onOpenChange={open => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        className={cn(albumTheme, 'block max-w-6xl space-y-4 p-4 sm:p-5')}
        onOpenAutoFocus={event => {
          event.preventDefault();
          title.current?.focus({ preventScroll: true });
        }}
        onCloseAutoFocus={event => {
          event.preventDefault();
          if (opener.current?.isConnected) opener.current.focus({ preventScroll: true });
          else
            document
              .querySelector<HTMLElement>('[aria-label="View all event albums"]')
              ?.focus({ preventScroll: true });
        }}
      >
        <DialogHeader>
          <DialogTitle
            ref={title}
            tabIndex={-1}
            className="flex items-start gap-2 text-lg! outline-none"
          >
            <Images className="mt-0.5 size-5 shrink-0 text-[var(--album-accent)]" />
            <span className="min-w-0 break-words">{tournamentName}</span>
          </DialogTitle>
          <DialogDescription className="sr-only">
            Event photos. Browse albums and photos from this tournament.
          </DialogDescription>
        </DialogHeader>
        <TournamentAlbumBrowser
          tournamentId={tournamentId}
          selectedAlbumId={selectedAlbumId}
          onSelectAlbum={setSelectedAlbumId}
          compact
        />
      </DialogContent>
    </Dialog>
  );
}
