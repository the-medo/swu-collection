import { Link } from '@tanstack/react-router';
import { Check, UserRound, Users } from 'lucide-react';
import { Button } from '@/components/ui/button.tsx';
import { useDeclineInvitation, useTeammates } from '@/api/crossfire/useInvitations.ts';
import { InvitationCountdown } from './CrossfireInvitations.tsx';
import { useCrossfireInvitations } from './invitationContext.ts';
import { InvitationPortraits } from './InvitationPortraits.tsx';
import InfoTooltip from '@/components/app/global/InfoTooltip/InfoTooltip.tsx';
import type { CrossfireTeammate } from '../../../../../shared/types/crossfire.ts';

export type InviteControls = {
  invite: (player: Pick<CrossfireTeammate, 'id' | 'name'>) => void;
  selectedPlayerId?: string;
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
        <InfoTooltip tooltip="Select a teammate, review your deck and settings, then send the invitation. Nothing is sent until you confirm. Sending locks in your deck and settings; your teammate has 3 minutes to choose their own deck and accept. Select the same teammate again to clear your selection." />
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
            const selected = controls.selectedPlayerId === player.id;
            const sent = invitations.some(
              i => i.direction === 'outgoing' && i.player.id === player.id,
            );
            return (
              <button
                key={player.id}
                type="button"
                className="cf-teammate"
                aria-pressed={selected}
                disabled={!controls.canInvite || sent || controls.pending}
                onClick={() => controls.invite(player)}
                aria-label={`Select teammate ${player.name}${sent ? ' (invited)' : ''}`}
              >
                {player.image ? (
                  <img src={player.image} alt="" referrerPolicy="no-referrer" />
                ) : (
                  <UserRound
                    size={24}
                    className="shrink-0 text-muted-foreground"
                    aria-hidden="true"
                  />
                )}
                <span className="cf-teammate-name">{player.name}</span>
                {sent && <small className="text-muted-foreground">Invited</small>}
                <span className="cf-deck-row-check" aria-hidden="true">
                  {selected && <Check size={13} />}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
