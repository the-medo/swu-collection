import { cn } from '@/lib/utils.ts';
import type { LiveTournamentWeekendTournamentEntry } from '../liveTournamentTypes.ts';
import {
  getMatchesRemainingLabel,
  getRoundLabel,
  getUndefeatedPlayers,
} from '../liveTournamentUtils.ts';
import type { TournamentLayout } from '../useTournamentLayout.ts';

function RoundProgressBar({
  entry,
  compact,
}: {
  entry: LiveTournamentWeekendTournamentEntry;
  compact: boolean;
}) {
  const { matchesTotal: total, matchesRemaining: remaining } = entry.weekendTournament;
  if (!total || total <= 0 || remaining === null || remaining === undefined) return null;
  const completed = Math.max(0, Math.min(total, total - remaining));
  return (
    <div
      className={cn(
        'live-event-progress-track h-[3px] rounded-[3px] overflow-hidden bg-[var(--live-line)]',
        compact ? 'flex-[0_0_64px] m-0' : 'mt-[9px]',
      )}
      role="progressbar"
      aria-label="Round matches completed"
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={completed}
    >
      <span
        className="block h-full bg-[var(--live-accent)] rounded-[inherit]"
        style={{ width: `${(completed / total) * 100}%` }}
      />
    </div>
  );
}

export function TournamentProgress({
  entry,
  layout,
}: {
  entry: LiveTournamentWeekendTournamentEntry;
  layout: TournamentLayout;
}) {
  if (entry.weekendTournament.status !== 'running') return null;
  const labels = (
    <>
      <strong className="font-semibold text-[color:var(--live-accent)]">
        {getRoundLabel(entry) ?? 'Tournament in progress'}
      </strong>
      <span className="text-muted-foreground">{getMatchesRemainingLabel(entry)}</span>
    </>
  );
  const undefeatedPlayers = getUndefeatedPlayers(entry);
  if (layout === 'rows') {
    return (
      <div className="live-row-progress [grid-area:progress] flex flex-wrap items-center gap-y-0.5 gap-x-2 min-w-0 text-muted-foreground text-[10px] leading-[1.5]">
        {labels}
        <RoundProgressBar entry={entry} compact />
        {undefeatedPlayers.length > 0 && (
          <span className="live-row-undefeated wrap-anywhere">
            Undefeated:{' '}
            {undefeatedPlayers
              .slice(0, 3)
              .map(row => `${row.playerDisplayName} ${row.matchRecord}`)
              .join(' · ')}
            {undefeatedPlayers.length > 3 && ` · +${undefeatedPlayers.length - 3}`}
          </span>
        )}
      </div>
    );
  }
  return (
    <div className="live-event-progress py-[11px] px-3 rounded-[8px] bg-[var(--live-tint)]">
      <div className="flex flex-wrap justify-between gap-y-1 gap-x-2.5 text-[10px]">{labels}</div>
      <RoundProgressBar entry={entry} compact={false} />
    </div>
  );
}
