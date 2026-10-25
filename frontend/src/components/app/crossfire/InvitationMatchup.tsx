import { useCardList } from '@/api/lists/useCardList.ts';
import { LeaderBaseArtwork } from '@/components/app/global/LeaderBaseArtwork.tsx';
import { cn } from '@/lib/utils.ts';

/** Only display the identities disclosed by the invitation, never fetch the host's deck. */
export function InvitationMatchup({
  leaderId,
  baseId,
  className,
}: {
  leaderId?: string;
  baseId?: string;
  className?: string;
}) {
  const { data } = useCardList();
  if (!leaderId && !baseId) return null;
  const leader = leaderId ? data?.cards[leaderId] : undefined;
  const base = baseId ? data?.cards[baseId] : undefined;
  return (
    <div
      className={cn(
        'cf-invitation-matchup flex min-w-0 items-center gap-3 rounded-xl border border-[color:var(--workspace-border)] bg-card p-3',
        className,
      )}
    >
      <div aria-hidden="true" className="shrink-0">
        <LeaderBaseArtwork leaderId={leaderId} baseKey={baseId} />
      </div>
      <div className="min-w-0 space-y-1">
        {leaderId && (
          <>
            <strong className="block text-sm font-semibold leading-snug wrap-anywhere">
              {leader?.title ?? 'Leader'}
            </strong>
            {leader?.subtitle && (
              <span className="block text-[11px] text-muted-foreground wrap-anywhere">
                {leader.subtitle}
              </span>
            )}
          </>
        )}
        {baseId && (
          <span className="block text-xs text-muted-foreground wrap-anywhere">
            {base?.name ?? 'Base'}
          </span>
        )}
      </div>
    </div>
  );
}
