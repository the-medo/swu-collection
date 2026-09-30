import { useEffect, useRef, useState } from 'react';
import { Star, X } from 'lucide-react';
import { Button } from '@/components/ui/button.tsx';
import { ButtonGroup } from '@/components/ui/button-group.tsx';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog.tsx';
import SignInWrapper from '@/components/app/auth/SignInWrapper.tsx';
import { useUser } from '@/hooks/useUser.ts';
import { useSavedTournaments, useSaveTournament } from '@/api/tournaments/useSavedTournaments.ts';
import { tournamentSaveStatuses } from '../../../../../types/UserTournamentSave.ts';

interface TournamentSaveControlsProps {
  tournamentId: string;
  simpleRemoval?: boolean;
  onRemovalConfirmationChange?: (open: boolean) => void;
}

export function TournamentSaveControls(props: TournamentSaveControlsProps) {
  const user = useUser();
  return (
    <SignInWrapper text="Save tournament">
      {user && <SignedInSaveControls key={user.id} userId={user.id} {...props} />}
    </SignInWrapper>
  );
}

function SignedInSaveControls({
  userId,
  tournamentId,
  simpleRemoval = false,
  onRemovalConfirmationChange,
}: TournamentSaveControlsProps & { userId: string }) {
  const query = useSavedTournaments();
  const mutation = useSaveTournament(tournamentId);
  const [confirmRemoval, setConfirmRemoval] = useState(false);
  const removeButton = useRef<HTMLButtonElement>(null);
  const changeConfirmation = (open: boolean) => {
    setConfirmRemoval(open);
    onRemovalConfirmationChange?.(open);
  };
  useEffect(() => () => onRemovalConfirmationChange?.(false), [onRemovalConfirmationChange]);
  const saved = query.data?.find(row => row.tournamentId === tournamentId);
  if (query.isPending)
    return (
      <p role="status" className="text-xs text-muted-foreground">
        Loading your saved tournaments…
      </p>
    );
  if (!query.data)
    return (
      <div role="alert" className="text-xs">
        Could not load your saved tournaments.{' '}
        <Button variant="link" size="sm" onClick={() => void query.refetch()}>
          Retry
        </Button>
      </div>
    );
  return (
    <div className="mt-2 space-y-1">
      <ButtonGroup aria-label="Tournament save status">
        {tournamentSaveStatuses.map(status => (
          <Button
            key={status}
            type="button"
            size="sm"
            variant={saved?.status === status ? 'default' : 'outline'}
            className="h-8 gap-1 px-2 text-xs"
            aria-pressed={saved?.status === status}
            disabled={mutation.isPending}
            onClick={() => {
              if (saved?.status !== status) mutation.mutate({ userId, status });
            }}
          >
            {status === 'saved' && <Star className="size-3.5" />}
            {status === 'saved'
              ? saved?.status === 'saved'
                ? 'Saved'
                : 'Save'
              : status === 'maybe'
                ? 'Maybe'
                : 'Going'}
          </Button>
        ))}
        {saved && (
          <Button
            ref={removeButton}
            type="button"
            variant="outline"
            size="icon"
            className="size-8"
            aria-label="Remove from your tournaments"
            title="Remove from your tournaments"
            disabled={mutation.isPending}
            onClick={() => {
              if (simpleRemoval) mutation.mutate({ userId, status: null });
              else {
                mutation.reset();
                changeConfirmation(true);
              }
            }}
          >
            <X className="size-4" />
          </Button>
        )}
      </ButtonGroup>
      <AlertDialog
        open={confirmRemoval}
        onOpenChange={open => {
          if (!mutation.isPending) changeConfirmation(open);
        }}
      >
        <AlertDialogContent
          container={document.fullscreenElement ?? undefined}
          onCloseAutoFocus={event => {
            event.preventDefault();
            removeButton.current?.focus();
          }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>Remove from my tournaments</AlertDialogTitle>
            <AlertDialogDescription>
              Remove this tournament from your saved list and calendar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          {mutation.error && (
            <p role="alert" className="text-sm text-destructive">
              {mutation.error.message}
            </p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={mutation.isPending}>Cancel</AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              disabled={mutation.isPending}
              onClick={() =>
                mutation.mutate(
                  { userId, status: null },
                  { onSuccess: () => changeConfirmation(false) },
                )
              }
            >
              {mutation.isPending ? 'Removing…' : 'Confirm'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {mutation.error && !confirmRemoval && (
        <p role="alert" className="text-xs text-destructive">
          {mutation.error.message}
        </p>
      )}
    </div>
  );
}
