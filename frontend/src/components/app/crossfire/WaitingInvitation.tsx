import { crossfireHomeStyles as styles } from './crossfireHomeStyles.ts';
import { useState } from 'react';
import { Copy, Link2 } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button.tsx';
import { Input } from '@/components/ui/input.tsx';
import { useCancelLobby } from '@/api/crossfire/useCancelLobby.ts';
import type { CrossfireLobby } from '../../../../../shared/types/crossfire.ts';
import { InvitationCountdown } from './CrossfireInvitations.tsx';
import { InvitationPortraits } from './InvitationPortraits.tsx';
import { PolicySummary } from './DeckEntryForm.tsx';

export function WaitingInvitation({
  lobby,
  sessionId,
}: {
  lobby: CrossfireLobby;
  sessionId: string;
}) {
  const cancel = useCancelLobby(sessionId, lobby.id);
  const [copied, setCopied] = useState(false);
  return (
    <section
      className={`${styles.panel} cf-host-waiting flex min-h-110 flex-col gap-5 sm:p-7`}
      aria-label="Waiting for your opponent"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className={styles.icon}>
            <Link2 className="size-4" />
          </span>
          <h2 className={styles.heading}>Waiting for your opponent</h2>
        </div>
        {lobby.expiresAt && <InvitationCountdown expiresAt={lobby.expiresAt} />}
      </div>
      <div className="max-w-80">
        <InvitationPortraits leaderId={lobby.host?.leaderId} baseId={lobby.host?.baseId} />
      </div>
      <p className="text-sm text-muted-foreground">
        Your deck is locked in. The game starts when your opponent accepts with their deck.
      </p>
      <p className="text-sm font-semibold">{lobby.bestOf === 3 ? 'Best of 3' : 'Best of 1'}</p>
      <PolicySummary policy={lobby.policy} />
      <p className="text-xs text-muted-foreground">
        {lobby.showLeader
          ? 'Your leader and base are visible before the game.'
          : 'Your leader and base are hidden before the game.'}
      </p>
      <label htmlFor="crossfire-share" className="block text-sm">
        Invitation link
      </label>
      <div className="flex gap-2">
        <Input
          id="crossfire-share"
          readOnly
          value={`${window.location.origin}/crossfire/${lobby.id}`}
          onFocus={e => e.currentTarget.select()}
        />
        <Button
          aria-label="Copy invitation"
          variant="outline"
          onClick={() => {
            void navigator.clipboard
              .writeText(`${window.location.origin}/crossfire/${lobby.id}`)
              .then(
                () => setCopied(true),
                () => setCopied(false),
              );
          }}
        >
          <Copy size={16} />
        </Button>
      </div>
      {copied && <p role="status">Invitation copied.</p>}
      {cancel.isError && <p role="alert">Could not cancel this invitation. Try again.</p>}
      <div className="mt-auto flex flex-wrap gap-2">
        <Button variant="outline" disabled={cancel.isPending} onClick={() => cancel.mutate()}>
          Cancel invitation
        </Button>
        <Button asChild variant="ghost">
          <Link to="/crossfire" search={{}}>
            Back to Crossfire
          </Link>
        </Button>
      </div>
    </section>
  );
}
