import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  useAiTrainingConsent,
  useSetAiTrainingConsent,
} from '@/api/crossfire/useAiTrainingConsent';
export function AiTrainingConsent({ gameId, sessionId }: { gameId: string; sessionId: string }) {
  const [open, setOpen] = useState(false);
  const query = useAiTrainingConsent(gameId, sessionId, open);
  const mutation = useSetAiTrainingConsent(gameId, sessionId);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          AI training
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Learn from this game</DialogTitle>
          <DialogDescription>
            Both players must agree before this game can help train Crossfire AI after it ends. We
            save each player's own deck, the information they could see, their choices and the
            result. Account identities and chat are excluded. This permission applies only to this
            game.
          </DialogDescription>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          You can withdraw permission for future training. This cannot undo learning already
          included in a trained model. Exported games expire after 90 days.
        </p>
        {query.isPending ? (
          <p role="status">Loading permission…</p>
        ) : query.isError ? (
          <div role="alert">
            <p>{query.error.message}</p>
            <Button variant="outline" onClick={() => void query.refetch()}>
              Try again
            </Button>
          </div>
        ) : (
          <>
            <p>
              {query.data.allowed
                ? 'You have allowed training use.'
                : 'You have not allowed training use.'}
            </p>
            <p className="text-sm">
              {query.data.state === 'revoked'
                ? 'This game has been withdrawn and will remain excluded.'
                : query.data.bothAllowed
                  ? 'Both players have agreed.'
                  : 'Waiting for both players to agree.'}
            </p>
            {query.data.state !== 'revoked' && (
              <Button
                disabled={mutation.isPending}
                onClick={() => mutation.mutate(!query.data.allowed)}
              >
                {mutation.isPending
                  ? 'Saving…'
                  : query.data.allowed
                    ? 'Withdraw permission'
                    : 'Allow training for this game'}
              </Button>
            )}
          </>
        )}
        {mutation.isError && <p role="alert">{mutation.error.message}</p>}
      </DialogContent>
    </Dialog>
  );
}
