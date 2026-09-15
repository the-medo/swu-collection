import { useRef, useState } from 'react';
import { Flag, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button.tsx';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog.tsx';
import { useLeaveGame } from '@/api/crossfire/useLeaveGame.ts';
import type { CrossfireExit } from '../../../../../shared/types/crossfire.ts';
import type { CrossfireConnection } from './connection.ts';
import { ToolbarButton } from './ToolbarButton.tsx';
import { crossfireError } from './presentation.ts';

export function LeaveGameButton({
  sessionId,
  lobbyId,
  bestOf = 1,
  compatible = true,
  exit,
  compact = false,
  connection,
  onLeft,
}: {
  sessionId: string;
  lobbyId: string;
  bestOf?: 1 | 3;
  compatible?: boolean;
  exit?: CrossfireExit | null;
  compact?: boolean;
  connection?: CrossfireConnection;
  onLeft?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const mutation = useLeaveGame(sessionId, lobbyId, onLeft);
  if (exit && exit.status !== 'pending') return null;
  const pending = mutation.isPending || (exit?.status === 'pending' && compatible);
  const concede =
    bestOf === 3 &&
    connection?.store.state.status === 'connected' &&
    !connection.store.state.pending &&
    connection.store.state.view?.phase !== 'ended';
  return (
    <>
      {compact ? (
        <ToolbarButton
          buttonRef={trigger}
          label={pending ? 'Leaving game…' : 'Leave game'}
          icon={<LogOut size={16} />}
          disabled={pending}
          onClick={() => setOpen(true)}
        />
      ) : (
        <Button
          ref={trigger}
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() => setOpen(true)}
        >
          <LogOut size={15} className="mr-2" />
          {pending ? 'Leaving…' : 'Leave game'}
        </Button>
      )}
      <Dialog
        open={open}
        onOpenChange={value => {
          if (!mutation.isPending) setOpen(value);
        }}
      >
        <DialogContent
          className="max-w-md"
          onCloseAutoFocus={event => {
            event.preventDefault();
            trigger.current?.focus();
          }}
        >
          <DialogHeader>
            <DialogTitle>
              {compatible
                ? bestOf === 3
                  ? 'Leave this match?'
                  : 'Leave this game?'
                : 'Close this unavailable game?'}
            </DialogTitle>
            <DialogDescription>
              {!compatible
                ? 'This game uses an older Crossfire version and cannot be resumed. It will be marked abandoned, with no winner, and removed from both players’ games in progress. Its saved data will be kept.'
                : bestOf === 3
                  ? 'Leaving forfeits the entire best-of-three match to your opponent. Your games and replays will be kept.'
                  : 'Your opponent will win by concession. The game and its replay will be kept.'}
            </DialogDescription>
          </DialogHeader>
          {concede && (
            <div className="space-y-2 rounded-md border p-3 text-sm">
              <p>To continue the match after losing only this game:</p>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  connection.concede();
                  setOpen(false);
                }}
              >
                <Flag size={15} className="mr-2" />
                Concede current game
              </Button>
            </div>
          )}
          {mutation.error && (
            <p role="alert" className="text-sm text-destructive">
              {crossfireError(mutation.error)}
            </p>
          )}
          <DialogFooter>
            <Button variant="ghost" disabled={mutation.isPending} onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={mutation.isPending}
              onClick={() =>
                mutation.mutate(undefined, {
                  onSuccess: () => {
                    setOpen(false);
                  },
                })
              }
            >
              {mutation.isPending
                ? 'Leaving…'
                : compatible
                  ? bestOf === 3
                    ? 'Leave match'
                    : 'Leave game'
                  : 'Close game'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
