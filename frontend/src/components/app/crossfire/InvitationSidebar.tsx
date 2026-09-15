import { Link } from '@tanstack/react-router';
import { Users } from 'lucide-react';
import { Button } from '@/components/ui/button.tsx';
import { useDeclineInvitation, useTeammates } from '@/api/crossfire/useInvitations.ts';
import { InvitationCountdown } from './CrossfireInvitations.tsx';
import { useCrossfireInvitations } from './invitationContext.ts';
import { InvitationPortraits } from './InvitationPortraits.tsx';
import { CrossfireLogo } from './CrossfireLogo.tsx';

export type InviteControls = {
  invite: (userId: string) => void;
  canInvite: boolean;
  pending: boolean;
};
export function InvitationSidebar({
  sessionId,
  controls,
}: {
  sessionId: string;
  controls: InviteControls;
}) {
  const { invitations } = useCrossfireInvitations();
  const teammates = useTeammates(sessionId);
  const decline = useDeclineInvitation(sessionId);
  return (
    <section className="cf-home-card space-y-4" aria-label="Invitations and teammates">
      {!!invitations.length && (
        <div className="cf-invite-list">
          {invitations.map(invite => (
            <article className="cf-invite-card" key={invite.lobbyId}>
              <div className="flex items-center justify-between gap-2">
                <strong>
                  {invite.direction === 'incoming'
                    ? `${invite.player.name} invited you`
                    : `Invited ${invite.player.name}`}
                </strong>
                <InvitationCountdown expiresAt={invite.expiresAt} />
              </div>
              {invite.direction === 'incoming' && (
                <InvitationPortraits leaderId={invite.leaderId} baseId={invite.baseId} />
              )}
              <div className="flex gap-2">
                <Button asChild size="sm" className="flex-1">
                  <Link to="/crossfire" search={{ cfInvite: invite.lobbyId }}>
                    {invite.direction === 'incoming' ? 'Open invitation' : 'View invitation'}
                  </Link>
                </Button>
                {invite.direction === 'incoming' && (
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={decline.isPending}
                    onClick={() => decline.mutate(invite.lobbyId)}
                  >
                    Decline
                  </Button>
                )}
              </div>
            </article>
          ))}
          {decline.isError && <p role="alert">Could not decline this invitation. Try again.</p>}
        </div>
      )}
      <h2 className="flex items-center gap-2">
        <Users size={16} />
        Teammates
      </h2>
      {teammates.isPending ? (
        <p role="status">Loading teammates…</p>
      ) : teammates.isError ? (
        <div role="alert">
          Could not load teammates.{' '}
          <Button size="sm" variant="ghost" onClick={() => void teammates.refetch()}>
            Try again
          </Button>
        </div>
      ) : !teammates.data?.length ? (
        <p className="text-xs text-muted-foreground">
          Join a team to invite teammates, or create an invitation link to share.
        </p>
      ) : (
        <div className="cf-teammates">
          {teammates.data.map(player => {
            const sent = invitations.some(
              i => i.direction === 'outgoing' && i.player.id === player.id,
            );
            return (
              <div key={player.id} className="cf-teammate">
                {player.image && <img src={player.image} alt="" referrerPolicy="no-referrer" />}
                <span>{player.name}</span>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!controls.canInvite || sent || controls.pending}
                  onClick={() => controls.invite(player.id)}
                  aria-label={`Invite ${player.name} to Crossfire`}
                >
                  <CrossfireLogo />
                  {sent ? 'Invited' : 'Crossfire'}
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
