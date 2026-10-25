import { useMemo } from 'react';
import { format } from 'date-fns';
import { ArrowRight, Swords, TrendingUp, UserRound } from 'lucide-react';
import { useCardList } from '@/api/lists/useCardList.ts';
import CardArtCrop from '@/components/app/global/CardArtCrop.tsx';
import { cn } from '@/lib/utils.ts';
import { StatSection } from '../common/StatSection.tsx';
import { statisticsStyles as styles } from '../statisticsStyles.ts';
import { areGameAndMatchRecordsEqual } from '../lib/resultStatistics.ts';
import { parseStatisticsTimestamp } from '../lib/date.ts';
import { getResultText } from '../lib/lib.ts';
import type { MatchResult } from '../lib/MatchResult.ts';
import { historyOpponents, recentHistoryForm } from './historyInsights.ts';

const resultTone =
  'data-[result=3]:bg-[var(--statistics-positive)] data-[result=0]:bg-[var(--statistics-negative)] data-[result=1]:bg-[var(--statistics-draw)]';

export default function HistoryOverview({
  matches,
  allMatches,
  opponentFilter,
  onOpponent,
  onSelect,
  isLoading,
  isError,
}: {
  isLoading: boolean;
  isError: boolean;
  matches: MatchResult[];
  allMatches: MatchResult[];
  opponentFilter: string | null;
  onOpponent: (leaderId: string | null) => void;
  onSelect: (id: string, trigger: HTMLButtonElement) => void;
}) {
  const { data } = useCardList();
  const form = useMemo(() => recentHistoryForm(matches), [matches]);
  const opponents = useMemo(() => historyOpponents(allMatches).slice(0, 5), [allMatches]);
  const { stats } = form;
  const points = form.trend
    .map(
      ({ rate }, i) => `${12 + (i * 336) / Math.max(1, form.trend.length - 1)},${92 - rate * 0.76}`,
    )
    .join(' ');
  if (!allMatches.length && (isLoading || isError)) {
    return (
      <p className="p-4 text-sm text-muted-foreground">
        {isLoading
          ? 'Loading recent form…'
          : 'Insights will be available when match history loads.'}
      </p>
    );
  }
  return (
    <div className="statistics-history-overview @container/history-form divide-y">
      <section className="p-4" aria-label="Recent form">
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>
            <TrendingUp size={16} aria-hidden="true" />
            Recent form
          </h2>
          <span className="text-xs text-muted-foreground">
            Last {form.matches.length} completed {form.matches.length === 1 ? 'match' : 'matches'}
          </span>
        </div>
        {opponentFilter !== null && (
          <p className="mb-3 text-xs font-medium text-primary">
            Against {data?.cards[opponentFilter]?.name ?? 'Unknown leader'}
          </p>
        )}
        {form.matches.length ? (
          <>
            <div className={cn('grid gap-3', !areGameAndMatchRecordsEqual(stats) && 'grid-cols-2')}>
              <StatSection
                label="Games"
                total={stats.totalGames}
                wins={stats.gameWins}
                losses={stats.gameLosses}
                draws={stats.gameDraws}
                winrate={stats.gameWinrate}
              />
              {!areGameAndMatchRecordsEqual(stats) && (
                <StatSection
                  label="Matches"
                  total={stats.totalMatches}
                  wins={stats.matchWins}
                  losses={stats.matchLosses}
                  draws={stats.matchDraws}
                  winrate={stats.matchWinrate}
                />
              )}
            </div>
            <div
              className="mt-4 flex flex-wrap gap-1"
              aria-label="Recent results, oldest to newest"
            >
              {form.matches.map(match => (
                <button
                  key={match.id}
                  type="button"
                  data-result={match.result}
                  data-history-result-id={match.id}
                  className={cn(
                    'h-7 min-w-0 max-w-8 flex-1 basis-[calc(10%-0.25rem)] @min-[400px]/history-form:basis-0 rounded-sm text-[10px] font-semibold text-white dark:text-background hover:opacity-75 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
                    resultTone,
                  )}
                  title={`${format(parseStatisticsTimestamp(match.firstGameCreatedAt), 'MMM d, HH:mm')} · ${getResultText(match.result)}`}
                  aria-label={`Inspect ${getResultText(match.result).toLowerCase()} on ${format(parseStatisticsTimestamp(match.firstGameCreatedAt), 'MMM d, HH:mm')}`}
                  onClick={event => onSelect(match.id, event.currentTarget)}
                >
                  {match.result === 3 ? 'W' : match.result === 0 ? 'L' : 'D'}
                </button>
              ))}
            </div>
            <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
              <span>Older</span>
              <span>Latest</span>
            </div>
            {form.trend.length > 1 && (
              <figure className="mt-4">
                <figcaption className="flex flex-wrap justify-between gap-1 text-xs text-muted-foreground">
                  <span>Match win-rate trend</span>
                  <span>Rolling, up to 10 matches</span>
                </figcaption>
                <svg
                  viewBox="0 0 360 110"
                  className="mt-1 h-28 w-full overflow-visible"
                  role="img"
                  aria-label={`Rolling match win rate, ending at ${form.trend.at(-1)!.rate.toFixed(1)}% over ${form.trend.at(-1)!.count} matches`}
                >
                  {[0, 50, 100].map(rate => (
                    <g key={rate}>
                      <line
                        x1="12"
                        x2="348"
                        y1={92 - rate * 0.76}
                        y2={92 - rate * 0.76}
                        className="stroke-border"
                        strokeDasharray="3 4"
                      />
                      <text
                        x="348"
                        y={87 - rate * 0.76}
                        textAnchor="end"
                        className="fill-muted-foreground text-[9px]"
                      >
                        {rate}%
                      </text>
                    </g>
                  ))}
                  <polyline
                    points={points}
                    fill="none"
                    strokeWidth="2.5"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    className="stroke-[var(--workspace-accent)]"
                  />
                  {form.trend.map(({ match, rate, count }, index) => (
                    <circle
                      key={match.id}
                      cx={12 + (index * 336) / (form.trend.length - 1)}
                      cy={92 - rate * 0.76}
                      r="3"
                      className="fill-[var(--workspace-accent)]"
                    >
                      <title>{`${format(parseStatisticsTimestamp(match.firstGameCreatedAt), 'MMM d, HH:mm')}: ${rate.toFixed(1)}% over ${count} matches`}</title>
                    </circle>
                  ))}
                </svg>
              </figure>
            )}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            No completed matches against external opponents in this selection yet.
          </p>
        )}
        {allMatches.some(match => match.inTeam || match.exclude) && (
          <p className="mt-2 text-xs text-muted-foreground">
            Form and opponent records exclude team-vs-team matches and results marked as excluded.
          </p>
        )}
      </section>
      <section className="p-4" aria-label="Most faced opponents">
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>
            <Swords size={16} aria-hidden="true" />
            Most faced
          </h2>
          <span className="text-xs text-muted-foreground">Completed matches · W/L</span>
        </div>
        {opponents.length ? (
          <div className="space-y-1">
            {opponents.map(({ leaderId, stats: record }) => {
              const leader = data?.cards[leaderId];
              const label = leader?.name ?? 'Unknown leader';
              return (
                <button
                  key={leaderId}
                  type="button"
                  aria-label={`Filter history against ${label}`}
                  aria-pressed={opponentFilter === leaderId}
                  onClick={() => onOpponent(opponentFilter === leaderId ? null : leaderId)}
                  className="flex w-full items-center gap-2 rounded-lg p-2 text-left hover:bg-muted/60 aria-pressed:bg-[var(--workspace-soft)] focus-visible:outline-2 focus-visible:outline-primary"
                >
                  <span
                    className="h-10 w-12 flex-none overflow-hidden rounded-md bg-muted"
                    aria-hidden="true"
                  >
                    {leader ? (
                      <CardArtCrop card={leader} fit="cover" className="h-full w-full" />
                    ) : (
                      <UserRound className="m-auto mt-2 size-6 text-muted-foreground" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-medium" title={label}>
                      {label}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {record.totalMatches} completed · {record.matchWinrate.toFixed(0)}% wins
                      {record.matchDraws > 0 && ` · ${record.matchDraws} draws`}
                    </span>
                  </span>
                  <span
                    className="flex shrink-0 gap-1 text-sm"
                    aria-label={`${record.matchWins} wins, ${record.matchLosses} losses`}
                  >
                    <span className={styles.recordWins}>
                      <span className={styles.recordNumber}>{record.matchWins}</span>
                      <span className="text-[10px]">W</span>
                    </span>
                    <span className={styles.recordLosses}>
                      <span className={styles.recordNumber}>{record.matchLosses}</span>
                      <span className="text-[10px]">L</span>
                    </span>
                  </span>
                  <ArrowRight
                    size={12}
                    className="shrink-0 text-muted-foreground"
                    aria-hidden="true"
                  />
                </button>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Opponent records will appear after completed matches.
          </p>
        )}
      </section>
    </div>
  );
}
