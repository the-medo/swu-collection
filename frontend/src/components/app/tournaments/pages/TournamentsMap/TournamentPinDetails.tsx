import { useUser } from '@/hooks/useUser.ts';
import type { MapTournament } from '../../../../../../../types/TournamentMap.ts';
import { TournamentEventInfo } from '../../TournamentEventInfo.tsx';

export function TournamentPinDetails({
  tournaments,
  simpleRemoval = false,
  onRemovalConfirmationChange,
}: {
  tournaments: MapTournament[];
  simpleRemoval?: boolean;
  onRemovalConfirmationChange?: (open: boolean) => void;
}) {
  const user = useUser();
  return (
    <div className="max-h-72 space-y-3 overflow-y-auto pr-3" aria-label="Tournament details">
      {tournaments.map(tournament => (
        <article key={tournament.id} className="border-b pb-2 last:border-0 last:pb-0">
          <TournamentEventInfo
            tournament={tournament}
            showSaveControls={!!user}
            simpleRemoval={simpleRemoval}
            onRemovalConfirmationChange={onRemovalConfirmationChange}
          />
        </article>
      ))}
    </div>
  );
}
