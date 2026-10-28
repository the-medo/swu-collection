import { useEffect, useRef, useState } from 'react';
import {
  Bookmark,
  CalendarX2,
  Check,
  ChevronDown,
  Clock,
  LoaderCircle,
  Star,
  X,
} from 'lucide-react';
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
import SignIn from '@/components/app/auth/SignIn.tsx';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu.tsx';
import { useUser } from '@/hooks/useUser.ts';
import { useSavedTournaments, useSaveTournament } from '@/api/tournaments/useSavedTournaments.ts';
import { tournamentSaveStatuses } from '../../../../../types/UserTournamentSave.ts';
import { cn } from '@/lib/utils.ts';

interface TournamentSaveControlsProps {
  tournamentId: string;
  simpleRemoval?: boolean;
  onRemovalConfirmationChange?: (open: boolean) => void;
  className?: string;
  variant?: 'buttons' | 'menu';
  hasEnded?: boolean;
}

export function TournamentSaveControls(props: TournamentSaveControlsProps) {
  const user = useUser();
  if (!user && props.variant === 'menu') {
    return (
      <SignIn
        trigger={
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 rounded-full border-primary/20 bg-card px-3 text-xs"
            aria-label={`Tournament save status: ${props.hasEnded ? "Didn't go" : 'Not going'}. Sign in to change`}
          >
            <CalendarX2 className="size-3.5" aria-hidden="true" />
            {props.hasEnded ? "Didn't go" : 'Not going'}
          </Button>
        }
      />
    );
  }
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
  className,
  variant = 'buttons',
  hasEnded = false,
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
  const notGoingLabel = hasEnded ? "Didn't go" : 'Not going';
  const goingLabel = hasEnded ? 'Went' : 'Going';
  const statusLabel =
    saved?.status === 'going'
      ? goingLabel
      : saved?.status === 'maybe'
        ? 'Maybe'
        : saved
          ? 'Saved'
          : notGoingLabel;
  const requestRemoval = () => {
    if (simpleRemoval) mutation.mutate({ userId, status: null });
    else {
      mutation.reset();
      changeConfirmation(true);
    }
  };
  if (query.isPending)
    return (
      <p role="status" className={cn('text-xs text-muted-foreground', className)}>
        Loading your saved tournaments…
      </p>
    );
  if (!query.data)
    return (
      <div role="alert" className={cn('text-xs', className)}>
        Could not load your saved tournaments.{' '}
        <Button variant="link" size="sm" onClick={() => void query.refetch()}>
          Retry
        </Button>
      </div>
    );
  return (
    <div className={cn('mt-2 space-y-1', className)}>
      {variant === 'menu' ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              ref={removeButton}
              type="button"
              size="sm"
              variant={saved ? 'default' : 'outline'}
              className="h-8 gap-1.5 rounded-full border-primary/20 px-3 text-xs shadow-none"
              aria-label={`Tournament save status: ${statusLabel}`}
              aria-busy={mutation.isPending}
            >
              {mutation.isPending ? (
                <LoaderCircle className="size-3.5 animate-spin" aria-hidden="true" />
              ) : saved?.status === 'going' ? (
                <Check className="size-3.5" aria-hidden="true" />
              ) : saved?.status === 'maybe' ? (
                <Clock className="size-3.5" aria-hidden="true" />
              ) : saved ? (
                <Bookmark className="size-3.5" aria-hidden="true" />
              ) : (
                <CalendarX2 className="size-3.5" aria-hidden="true" />
              )}
              {statusLabel}
              <ChevronDown className="size-3" aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-44 rounded-xl"
            onCloseAutoFocus={event => {
              if (confirmRemoval) event.preventDefault();
            }}
          >
            <DropdownMenuLabel className="text-[11px] text-muted-foreground">
              {hasEnded ? 'Your tournament' : 'Your tournament plans'}
            </DropdownMenuLabel>
            <DropdownMenuRadioGroup value={saved?.status ?? 'not-going'}>
              <DropdownMenuRadioItem
                value="not-going"
                disabled={mutation.isPending}
                className="gap-2 rounded-md text-xs"
                onSelect={() => {
                  if (saved) requestRemoval();
                }}
              >
                <CalendarX2 className="size-3.5" aria-hidden="true" />
                {notGoingLabel}
              </DropdownMenuRadioItem>
              {tournamentSaveStatuses.map(status => (
                <DropdownMenuRadioItem
                  key={status}
                  value={status}
                  disabled={mutation.isPending}
                  className="gap-2 rounded-md text-xs"
                  onSelect={() => {
                    if (saved?.status !== status) mutation.mutate({ userId, status });
                  }}
                >
                  {status === 'saved' ? (
                    <Bookmark className="size-3.5" aria-hidden="true" />
                  ) : status === 'maybe' ? (
                    <Clock className="size-3.5" aria-hidden="true" />
                  ) : (
                    <Check className="size-3.5" aria-hidden="true" />
                  )}
                  {status === 'saved' ? 'Save' : status === 'maybe' ? 'Maybe' : goingLabel}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
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
              onClick={requestRemoval}
            >
              <X className="size-4" />
            </Button>
          )}
        </ButtonGroup>
      )}
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
            <AlertDialogTitle>
              {variant === 'menu' ? 'Update your tournament status' : 'Remove from my tournaments'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {variant === 'menu'
                ? `Mark yourself as “${notGoingLabel}”? This also removes the tournament from your saved list and calendar.`
                : 'Remove this tournament from your saved list and calendar?'}
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
              {mutation.isPending ? 'Removing…' : variant === 'menu' ? notGoingLabel : 'Confirm'}
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
