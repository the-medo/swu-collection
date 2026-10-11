import { cn } from '@/lib/utils.ts';
import type { LiveTournamentWeekendDetail } from '../liveTournamentTypes.ts';
import { StreamsSection } from './StreamsSection.tsx';
import { WatchedPlayersSection } from './WatchedPlayersSection.tsx';

export function PlayersAndStreamsSection({
  detail,
  pendingResourceCount = 0,
}: {
  detail: LiveTournamentWeekendDetail;
  pendingResourceCount?: number;
}) {
  return (
    <aside
      className={cn(
        'live-weekend-sidebar grid min-w-0 gap-5',
        'max-desktop:grid-cols-2 max-desktop:items-start',
        'max-mobile:grid-cols-1',
      )}
    >
      <div
        className={cn(
          'live-panel live-streams-panel min-w-0 p-5.5 border border-border rounded-[18px] bg-card',
          'max-mobile:p-4.5',
        )}
      >
        <StreamsSection detail={detail} pendingResourceCount={pendingResourceCount} />
      </div>
      <div
        className={cn(
          'live-panel min-w-0 p-5.5 border border-border rounded-[18px] bg-card',
          'max-mobile:p-4.5',
        )}
      >
        <WatchedPlayersSection detail={detail} />
      </div>
    </aside>
  );
}
