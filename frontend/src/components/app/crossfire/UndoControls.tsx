import { useStore } from '@tanstack/react-store';
import { Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/button.tsx';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog.tsx';
import type { CrossfireConnection } from './connection.ts';
import { ToolbarButton } from './ToolbarButton.tsx';
export function UndoControls({ connection }: { connection: CrossfireConnection }) {
  const state = useStore(connection.store),
    pending = state.undo;
  const seat = state.viewer?.role === 'player' ? state.viewer.seat : null;
  if (!seat) return pending ? <span>Waiting for undo approval</span> : null;
  return (
    <>
      <ToolbarButton
        label="Undo"
        tone="undo"
        icon={<Undo2 size={17} />}
        disabled={
          state.status !== 'connected' ||
          state.pending ||
          state.controlPending ||
          !!pending ||
          state.view?.phase !== 'action' ||
          !!state.view.result
        }
        onClick={() => connection.undo('request')}
      >
        <span className="cf-undo-label">Undo</span>
      </ToolbarButton>
      <Dialog open={!!pending}>
        <DialogContent
          className="[&>button]:hidden"
          onEscapeKeyDown={e => e.preventDefault()}
          onPointerDownOutside={e => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>
              {pending?.requester === seat ? 'Waiting for your opponent' : 'Allow undo?'}
            </DialogTitle>
            <DialogDescription>
              Return to the start of the requested action, including its costs and nested effects.
              Gameplay is paused for up to one minute.
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This may involve inspected cards, revealed information or random effects. Undo restores
            the original deck order; it cannot erase what either player has seen.
          </p>
          <div className="flex justify-end gap-2">
            {pending?.requester === seat ? (
              <Button
                disabled={state.controlPending}
                variant="outline"
                onClick={() => connection.undo('cancel')}
              >
                Cancel request
              </Button>
            ) : (
              <>
                <Button
                  disabled={state.controlPending}
                  variant="outline"
                  onClick={() => connection.undo('decline')}
                >
                  Decline
                </Button>
                <Button disabled={state.controlPending} onClick={() => connection.undo('approve')}>
                  Allow undo
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
