import { useRef, useState } from 'react';
import { ShieldCheck, ShieldOff } from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions.ts';
import { useToast } from '@/hooks/use-toast.ts';
import { useModerateAlbumEventLink } from '@/api/user-albums/useModerateAlbumEventLink.ts';
import { Button } from '@/components/ui/button.tsx';
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog.tsx';

export function AlbumModerationAction({
  album,
  block,
}: {
  album: { id: string; title: string; revision: number };
  block: boolean;
}) {
  const allowed = usePermissions()('admin', 'access');
  const [open, setOpen] = useState(false);
  const mutation = useModerateAlbumEventLink();
  const trigger = useRef<HTMLButtonElement>(null);
  const { toast } = useToast();
  if (!allowed) return null;
  const label = block ? 'Remove from events' : 'Restore event linking';
  return (
    <AlertDialog
      open={open}
      onOpenChange={next => {
        if (!mutation.isPending) {
          setOpen(next);
          if (next) mutation.reset();
        }
      }}
    >
      <AlertDialogTrigger asChild>
        <Button ref={trigger} variant="outline" size="sm" className="mt-auto self-start rounded-xl">
          {block ? <ShieldOff /> : <ShieldCheck />}
          {label}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent
        onCloseAutoFocus={event => {
          // Successful moderation removes this card from the current list.
          if (!trigger.current?.isConnected) {
            event.preventDefault();
            document.querySelector<HTMLElement>('[data-album-moderation-focus]')?.focus();
          }
        }}
      >
        <AlertDialogHeader>
          <AlertDialogTitle>
            {block ? 'Remove this album from events?' : 'Restore event linking?'}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {block
              ? `“${album.title}” will be removed from its tournament. Its owner cannot link it to any event until an admin restores that ability. The album, privacy setting, and uploaded photos are kept.`
              : `The owner of “${album.title}” will be able to link it to events again. Restoring this ability does not automatically link or publish the album.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {mutation.error && (
          <p role="alert" className="text-sm text-destructive">
            {mutation.error.message}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={mutation.isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={mutation.isPending}
            onClick={event => {
              event.preventDefault();
              mutation.mutate(
                { id: album.id, revision: album.revision, blocked: block },
                {
                  onSuccess: () => {
                    setOpen(false);
                    toast({
                      title: block ? 'Album removed from events' : 'Event linking restored',
                    });
                  },
                },
              );
            }}
          >
            {mutation.isPending ? 'Saving…' : label}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
