import { WatchedPlayersManager } from '@/components/app/player-watch/WatchedPlayersManager.tsx';

export default function WatchedPlayersSettings() {
  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-2xl">Watched players</h2>
      <WatchedPlayersManager showDescription />
    </div>
  );
}
