import { format } from 'date-fns';
import { useCardList } from '@/api/lists/useCardList.ts';
import { cn } from '@/lib/utils.ts';
import MatchResultBox from '../components/MatchResultBox/MatchResultBox.tsx';
import type { MatchResult } from '../lib/MatchResult.ts';
import { parseStatisticsTimestamp } from '../lib/date.ts';
import { getResultText } from '../lib/lib.ts';
import { basicBaseForAspect } from '../../../../../../shared/lib/basicBases.ts';

export default function HistoryMatchRow({
  match,
  selected,
  inSheet,
  onSelect,
}: {
  match: MatchResult;
  selected: boolean;
  inSheet: boolean;
  onSelect: (id: string, trigger: HTMLButtonElement) => void;
}) {
  const { data } = useCardList();
  const leaderName = (id?: string) => data?.cards[id ?? '']?.name ?? 'Unknown leader';
  const baseName = (key?: string) =>
    data?.cards[key ?? '']?.name ??
    data?.cards[basicBaseForAspect[key ?? '']]?.name ??
    'Unknown base';
  const artworkLabel = `${leaderName(match.leaderCardId)} / ${baseName(match.baseCardKey)} vs ${leaderName(match.opponentLeaderCardId)} / ${baseName(match.opponentBaseCardKey)}`;
  const result =
    match.status === 'in-progress'
      ? 'In progress'
      : match.status === 'abandoned'
        ? 'Abandoned'
        : getResultText(match.result);
  return (
    <div className="statistics-history-row relative isolate border-b last:border-b-0 [&_.statistics-match_a]:relative [&_.statistics-match_a]:z-20 [&_.statistics-match_button]:relative [&_.statistics-match_button]:z-20">
      <MatchResultBox match={match} artworkVariant="portrait" />
      <button
        type="button"
        className={cn(
          'absolute inset-0 z-10 cursor-pointer transition-colors hover:bg-primary/5 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary',
          selected && 'bg-primary/5 ring-2 ring-inset ring-primary',
        )}
        title={artworkLabel}
        aria-label={`View match: ${artworkLabel}, ${format(parseStatisticsTimestamp(match.firstGameCreatedAt), 'MMM d, yyyy HH:mm')}: ${result}`}
        aria-current={!inSheet && selected ? 'true' : undefined}
        aria-haspopup={inSheet ? 'dialog' : undefined}
        onClick={event => onSelect(match.id, event.currentTarget)}
      />
    </div>
  );
}
