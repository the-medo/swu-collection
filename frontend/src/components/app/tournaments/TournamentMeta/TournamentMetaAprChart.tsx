import { useId, useMemo, useState } from 'react';
import { ArrowDown } from 'lucide-react';
import type { TournamentDeckResponse } from '@/api/tournaments/useGetTournamentDecks.ts';
import { useCardList } from '@/api/lists/useCardList.ts';
import InfoTooltip from '@/components/app/global/InfoTooltip/InfoTooltip.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Alert } from '@/components/ui/alert.tsx';
import {
  analyzeAprComparisons,
  aprMetrics,
  getAprSort,
  sortAprComparisons,
  type AprMetric,
  type AprTournaments,
} from './tournamentMetaApr.ts';
import { getDeckKeys } from './tournamentMetaLib.ts';
import { useLabel } from './useLabel.tsx';
import type { MetaInfo } from './MetaInfoSelector.tsx';
import { chartConfig } from './tournamentMetaAprPresentation.ts';
import TournamentMetaAprRechartsPlot from './TournamentMetaAprRechartsPlot.tsx';
import { processBase } from '../../../../../../shared/lib/processBase.ts';

interface Props {
  decks: TournamentDeckResponse[];
  tournaments: AprTournaments;
  metaInfo: MetaInfo;
  sortBy?: AprMetric;
  onSortChange: (metric: AprMetric) => void;
}

export default function TournamentMetaAprChart({
  decks,
  tournaments,
  metaInfo,
  sortBy,
  onSortChange,
}: Props) {
  const { data: cardList, isPending, isError } = useCardList();
  const label = useLabel();
  const id = useId();
  const [minimumCount, setMinimumCount] = useState(2);
  const [minimumDraft, setMinimumDraft] = useState('2');
  const analysis = useMemo(
    () =>
      analyzeAprComparisons(
        cardList
          ? decks.map(deck => ({
              tournamentId: deck.tournamentDeck.tournamentId,
              placement: deck.tournamentDeck.placement,
              keys: getDeckKeys(deck, metaInfo, cardList),
            }))
          : [],
        tournaments,
      ),
    [decks, tournaments, metaInfo, cardList],
  );
  const sortMetric = getAprSort(analysis, sortBy);
  // Sorting and display filters never change a stage's population or denominator.
  const data = useMemo(
    () =>
      sortAprComparisons(analysis.data, sortMetric)
        .filter(item => item.count >= minimumCount)
        .map(item => {
          const [leaderId, baseKey] =
            metaInfo === 'leadersAndBase'
              ? item.key.split('|')
              : metaInfo === 'leaders'
                ? [item.key, undefined]
                : metaInfo === 'bases'
                  ? [undefined, item.key]
                  : [];
          const hasArtwork =
            (!leaderId || !!cardList?.cards[leaderId]) &&
            (!baseKey || !!processBase(baseKey, cardList?.cards).baseCard);
          const name =
            item.key === 'no-aspect'
              ? 'No aspect'
              : item.key === 'unknown'
                ? metaInfo === 'aspects'
                  ? 'Unknown aspects'
                  : 'Unknown'
                : hasArtwork
                  ? String(label(item.key, metaInfo, 'text') || '').trim() || item.key
                  : item.key;
          return { ...item, name, hasArtwork };
        }),
    [analysis.data, sortMetric, minimumCount, label, metaInfo, cardList],
  );
  const largestRate = data.reduce(
    (largest, item) =>
      Math.max(largest, ...analysis.metrics.map(metric => Math.abs(item.values[metric] ?? 0))),
    1,
  );
  const axisStep = 10 ** Math.floor(Math.log10(largestRate));
  const axisExtent = Math.ceil(largestRate / axisStep) * axisStep;

  return (
    <section
      className="min-w-0 space-y-4 rounded-lg border bg-card p-3 sm:p-5"
      aria-labelledby={`${id}-title`}
    >
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
          <div className="flex items-center gap-1">
            <h3 id={`${id}-title`} className="text-lg font-semibold">
              Adjusted performance rate (APR)
            </h3>
            <InfoTooltip
              className="shrink-0"
              tooltip={
                <>
                  <p>
                    Compare how each deck gains or loses field share through the tournament.
                    Positive is above expectation, negative is below, and 0% is unchanged share.
                  </p>
                  {analysis.metrics.includes('combined') && (
                    <p>
                      Combined APR = Field → Day 2 + Day 2 → Top 8. It stops at Top 8; the champion
                      stage is shown separately.
                    </p>
                  )}
                </>
              }
            />
          </div>
          {!isPending && !isError && (
            <p className="text-sm text-muted-foreground sm:ml-auto sm:text-right" role="status">
              {data.length} of {analysis.data.length} deck groups · Sorted by{' '}
              {aprMetrics[sortMetric].label} (highest first)
            </p>
          )}
        </div>
        <div className="min-w-0 space-y-2" role="group" aria-label="APR details">
          <details className="text-sm text-muted-foreground">
            <summary className="ml-auto w-fit max-w-full text-right cursor-pointer font-medium text-foreground">
              How APR is calculated
            </summary>
            <div className="mt-2 max-w-3xl space-y-2">
              <p>
                APR = ((ending share ÷ starting share) − 1) × (log(starting decks + 1) ÷ log(all
                starting decks + 1)) × 100. Shares use unrounded counts. The adjustment reduces the
                influence of small samples; it is not a confidence interval or a win rate.{' '}
                <a
                  className="underline"
                  href="https://swu.report/2025/08/06/were-talking-about-it-wrong-championship-level-metrics-from-vegas/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Methodology by The SWU Report ↗
                </a>
              </p>
              <p>
                Day 2 stages use events with a recorded Day 2 player count. Field → Top 8 uses
                events without one (zero or unset). Top 8 → Champion uses all eligible events. Each
                stage pools its starting and ending shares from the same tournaments. Combined APR
                sums the two Day 2 stages using only events eligible for both; if imports are
                incomplete, its component scores can differ from the separately pooled stage scores.
              </p>
              <p>
                Missing observations appear as a dash, not 0%. A group needs recorded Day 2 entries
                for Combined APR. Groups without a value for the chosen sort appear last. Minimum
                recorded decks filters by ranked entries in this selection; it never changes APR.
              </p>
              <p>
                Only positive recorded placements are included. Events without target-stage results
                or a starting baseline are excluded. Incomplete imports can bias the result. Pooled
                results can also shift with event sizes and advancement rates; select an individual
                tournament to see its result separately. Unknown groups include decks without the
                information needed for this grouping.
                {metaInfo === 'aspects' &&
                  ' Each deck counts once per aspect, even for double-aspect decks.'}
              </p>
            </div>
          </details>

          {!isPending && !isError && (
            <>
              <details className="text-sm text-muted-foreground">
                <summary className="ml-auto w-fit max-w-full text-right cursor-pointer font-medium text-foreground">
                  Tournaments and sample counts by stage
                </summary>
                <ul className="mt-2 space-y-2">
                  {analysis.metrics.map(metric => {
                    const stage =
                      metric === 'combined' ? analysis.combined.fieldDay2 : analysis.stages[metric];
                    const end =
                      metric === 'combined' ? analysis.combined.day2Top8.endTotal : stage.endTotal;
                    return (
                      <li key={metric}>
                        <span className="font-medium">{aprMetrics[metric].label}:</span>{' '}
                        {stage.tournamentCount} tournaments · {aprMetrics[metric].from}:{' '}
                        {stage.startTotal} decks → {aprMetrics[metric].to}: {end} decks.
                        {stage.incompleteTournamentCount > 0 &&
                          ` ${stage.incompleteTournamentCount} included events have incomplete fields.`}
                        {stage.excludedTournamentCount > 0 &&
                          ` ${stage.excludedTournamentCount} events excluded for missing stage data or starting baselines.`}
                        {stage.unrankedDeckCount > 0 &&
                          ` ${stage.unrankedDeckCount} decks excluded for missing or invalid placements.`}
                      </li>
                    );
                  })}
                </ul>
              </details>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex shrink-0 items-center gap-2">
          <label htmlFor={`${id}-minimum`} className="whitespace-nowrap text-xs font-medium">
            Min. recorded decks
          </label>
          <div className="w-16 shrink-0">
            <Input
              id={`${id}-minimum`}
              type="number"
              min={1}
              step={1}
              className="h-8 px-2"
              value={minimumDraft}
              onChange={event => {
                setMinimumDraft(event.target.value);
                const value = event.target.valueAsNumber;
                if (Number.isSafeInteger(value) && value >= 1) setMinimumCount(value);
              }}
              onBlur={() => setMinimumDraft(String(minimumCount))}
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Sort APR by">
          <span className="text-xs font-medium">Sort by:</span>
          {analysis.metrics.map(metric => (
            <Button
              key={metric}
              type="button"
              variant={sortMetric === metric ? 'secondary' : 'outline'}
              size="sm"
              className="h-auto min-h-8 gap-1.5 whitespace-normal text-xs"
              aria-pressed={sortMetric === metric}
              onClick={() => onSortChange(metric)}
            >
              <span
                className="size-2.5 shrink-0 rounded-sm"
                style={{ backgroundColor: chartConfig[metric].color }}
                aria-hidden="true"
              />
              {aprMetrics[metric].label}
              {sortMetric === metric && (
                <ArrowDown className="size-3 shrink-0" aria-hidden="true" />
              )}
            </Button>
          ))}
        </div>
      </div>

      {isPending ? (
        <p role="status">Loading card data…</p>
      ) : isError ? (
        <Alert variant="destructive">
          Card data could not be loaded. Please reload to try again.
        </Alert>
      ) : !data.length ? (
        <p className="py-8 text-center text-muted-foreground">
          {analysis.data.length
            ? 'No decks meet the minimum recorded count. Lower the filter to see results.'
            : 'APR needs ranked deck data at both stages. No comparison is available for this selection.'}
        </p>
      ) : (
        <TournamentMetaAprRechartsPlot
          key={JSON.stringify([
            metaInfo,
            sortMetric,
            minimumCount,
            Object.keys(tournaments).sort(),
          ])}
          data={data}
          analysis={analysis}
          axisExtent={axisExtent}
          metaInfo={metaInfo}
          sortMetric={sortMetric}
        />
      )}
    </section>
  );
}
