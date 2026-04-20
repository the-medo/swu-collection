import type { LiveTournamentWeekendDetail } from '../liveTournamentTypes.ts';
import { StreamsSection } from './StreamsSection.tsx';
import { WatchedPlayersSection } from './WatchedPlayersSection.tsx';

export function PlayersAndStreamsSection({ detail }: { detail: LiveTournamentWeekendDetail }) {
  return (
    <section className="flex h-full w-full flex-col gap-4">
      <WatchedPlayersSection detail={detail} />
      <div className="border-t pt-4">
        <StreamsSection detail={detail} />
      </div>
    </section>
  );
}
