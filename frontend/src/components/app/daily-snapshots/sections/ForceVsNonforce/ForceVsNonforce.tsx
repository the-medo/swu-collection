import { cn } from '@/lib/utils.ts';
import { Sparkles } from 'lucide-react';
import * as React from 'react';
import { useMemo } from 'react';
import { ResponsivePie } from '@nivo/pie';
import { DailySnapshotRow } from '@/api/daily-snapshot';
import type {
  DailySnapshotSectionData,
  SectionForceVsNonForceCounts,
  TournamentGroupExtendedInfo,
} from '../../../../../../../types/DailySnapshots.ts';
import { SectionInfoTooltip } from '../components/SectionInfoTooltip.tsx';
import SectionDropdownMenu from '@/components/app/daily-snapshots/sections/components/SectionDropdownMenu.tsx';
import SectionHeader from '../components/SectionHeader.tsx';
import MetaEmptyState from '../components/MetaEmptyState.tsx';
import { useTheme } from '@/components/theme-provider.tsx';

export interface ForceVsNonforceProps {
  payload: DailySnapshotSectionData<SectionForceVsNonForceCounts>;
  dailySnapshot?: DailySnapshotRow | null;
  sectionUpdatedAt?: string;
}

const stripWeekend = (name?: string | null): string | undefined => {
  if (!name) return undefined;
  return name.replace(/Weekend/gi, '').trim();
};

const pct = (num: number, den: number): number => {
  if (!den || den <= 0) return 0;
  return Math.round((num / den) * 100);
};

const ForceVsNonforce: React.FC<ForceVsNonforceProps> = ({
  payload,
  dailySnapshot,
  sectionUpdatedAt,
}) => {
  const { theme } = useTheme();
  const darkTheme =
    theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  // Resolve group labels and ext info for tooltip
  const { w1Label, w2Label, groups } = useMemo(() => {
    const w1Name = stripWeekend(payload.data.week1GroupExt?.tournamentGroup?.name) || 'Week 1';
    const w2Name = stripWeekend(payload.data.week2GroupExt?.tournamentGroup?.name) || 'Week 2';
    const arr: TournamentGroupExtendedInfo[] = [
      payload.data.twoWeeksGroupExt,
      payload.data.week1GroupExt,
      payload.data.week2GroupExt,
    ].filter(Boolean) as TournamentGroupExtendedInfo[];
    return { w1Label: w1Name, w2Label: w2Name, groups: arr } as const;
  }, [payload.data.week1GroupExt, payload.data.week2GroupExt, payload.data.twoWeeksGroupExt]);

  // Two-week totals (total, top8, champions)
  const twoWeeksTotalForce = payload.data.twoWeeks.total.force || 0;
  const twoWeeksTotalNonforce = payload.data.twoWeeks.total.nonforce || 0;
  const twoWeeksTotal = twoWeeksTotalForce + twoWeeksTotalNonforce;
  const twoWeeksPct = pct(twoWeeksTotalForce, twoWeeksTotal);

  const twoWeeksTop8Force = payload.data.twoWeeks.top8.force || 0;
  const twoWeeksTop8Nonforce = payload.data.twoWeeks.top8.nonforce || 0;
  const twoWeeksTop8Total = twoWeeksTop8Force + twoWeeksTop8Nonforce;
  const twoWeeksTop8Pct = pct(twoWeeksTop8Force, twoWeeksTop8Total);

  const twoWeeksChampForce = payload.data.twoWeeks.champions.force || 0;
  const twoWeeksChampNonforce = payload.data.twoWeeks.champions.nonforce || 0;
  const twoWeeksChampTotal = twoWeeksChampForce + twoWeeksChampNonforce;
  const twoWeeksChampPct = pct(twoWeeksChampForce, twoWeeksChampTotal);

  // Helper to compute week/category percentage
  const percFor = (which: 'week1' | 'week2', cat: 'total' | 'top8' | 'champions'): number => {
    const split = payload.data[which][cat];
    const f = split.force || 0;
    const n = split.nonforce || 0;
    return pct(f, f + n);
  };

  const CenteredMetric = ({ centerX, centerY }: { centerX: number; centerY: number }) => (
    <text
      x={centerX}
      y={centerY}
      textAnchor="middle"
      dominantBaseline="central"
      className="fill-foreground"
      style={{ fontSize: 24, fontWeight: 700 }}
    >
      {twoWeeksPct}%
    </text>
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chartDataTwoWeeks: any = [
    { id: 'Force', value: twoWeeksTotalForce },
    { id: 'Non-Force', value: twoWeeksTotalNonforce },
  ];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const layersAny: any = ['arcs', CenteredMetric];

  return (
    <div className="meta-section-content flex flex-col gap-4.5 w-full h-full min-w-0">
      <SectionHeader
        title="Force vs. Non-Force"
        icon={Sparkles}
        description="Force base usage across the field"
        info={
          <>
            <SectionInfoTooltip
              dailySnapshot={dailySnapshot}
              sectionDataWarning={true}
              sectionUpdatedAt={sectionUpdatedAt}
              tournamentGroupExtendedInfo={groups}
            >
              <div className="text-sm">
                This section shows how many decks used a Force base versus non-Force. Force bases
                include all 28hp common bases and all rare force bases.
              </div>
              <div>
                This metric does NOT show all decks using force units or decks using Force Throw if
                they don't use the force base.
              </div>
            </SectionInfoTooltip>
          </>
        }
        dropdownMenu={
          <SectionDropdownMenu>
            <div className="flex items-center gap-2 max-w-60 p-2 text-sm">
              For now, there are no other pages that would show you more detailed data about Force
              vs. Non-Force usage.
            </div>
          </SectionDropdownMenu>
        }
      />

      {twoWeeksTotal === 0 && twoWeeksTop8Total === 0 && twoWeeksChampTotal === 0 ? (
        <MetaEmptyState title="No base data yet" icon={Sparkles}>
          Force and non-Force shares will appear with imported decklists.
        </MetaEmptyState>
      ) : (
        <div className="meta-force-layout flex flex-col gap-5">
          {/* Left: Two-week summary */}
          <div
            className={cn(
              'meta-force-summary flex flex-col items-center gap-[9px]',
              '[&_.meta-subheading]:m-0!',
            )}
          >
            <div
              className={cn(
                'meta-subheading mx-0! mt-0! mb-2.5! text-[11px]! font-semibold! text-muted-foreground',
                'tracking-[0.055em]! uppercase',
              )}
            >
              Last 2 weeks
            </div>
            <div className="meta-force-donut w-27 h-27">
              <ResponsivePie
                data={chartDataTwoWeeks}
                margin={{ top: 2, right: 2, bottom: 2, left: 2 }}
                innerRadius={0.8}
                animate={false}
                padAngle={0}
                cornerRadius={0}
                activeOuterRadiusOffset={2}
                enableArcLabels={false}
                enableArcLinkLabels={false}
                isInteractive={false}
                // React Spring requires concrete colors, even when chart animation is disabled.
                colors={({ id }) =>
                  id === 'Force'
                    ? darkTheme
                      ? '#b9d4a8'
                      : '#326149'
                    : darkTheme
                      ? '#364437'
                      : '#d5e0cd'
                }
                layers={layersAny}
              />
            </div>
            <p className="meta-chart-hint m-0! text-center text-[11px]! text-muted-foreground">
              of entries use a Force base
            </p>
            <dl
              className={cn(
                'meta-force-metrics w-full mx-0 mt-1 mb-0 text-[12px]',
                '[&_>_div]:flex [&_>_div]:justify-between [&_>_div]:gap-3 [&_>_div]:py-[7px] [&_>_div]:px-0',
                '[&_>_div]:border-b [&_>_div]:border-solid [&_>_div]:border-b-border',
                '[&_>_div:last-child]:border-0',
                '[&_dd]:flex [&_dd]:items-center [&_dd]:gap-3.5 [&_dd]:tabular-nums',
                '[&_dd_>_span]:text-muted-foreground [&_dd_>_span]:text-[11px]',
                '[&_strong]:min-w-8.5 [&_strong]:text-right [&_strong]:text-[color:var(--meta-accent)]',
              )}
            >
              {[
                ['Total', twoWeeksTotalForce, twoWeeksTotal, twoWeeksPct],
                ['Top 8', twoWeeksTop8Force, twoWeeksTop8Total, twoWeeksTop8Pct],
                ['Champions', twoWeeksChampForce, twoWeeksChampTotal, twoWeeksChampPct],
              ].map(([label, force, total, share]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>
                    <span>
                      {force} / {total}
                    </span>
                    <strong>{share}%</strong>
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Right: By weekends table */}
          <div className="meta-force-weekends @container/f-table min-w-0">
            <div
              className={cn(
                'meta-subheading mb-2 mx-0! mt-0! mb-2.5! text-[11px]! font-semibold! text-muted-foreground',
                'tracking-[0.055em]! uppercase',
              )}
            >
              By weekends
            </div>
            <div className={cn('flex flex-col gap-4 w-full text-sm', '@[260px]/f-table:hidden')}>
              <div className="flex flex-col w-full">
                <div className="w-full text-right py-1 px-1 bg-muted/30 rounded-sm font-medium">
                  {w1Label}
                </div>
                <div className="flex items-center justify-between py-1">
                  <div>Total</div>
                  <div className="text-right font-medium tabular-nums">
                    {percFor('week1', 'total')}%
                  </div>
                </div>
                <div className="flex items-center justify-between py-1 border-t">
                  <div>Top 8</div>
                  <div className="text-right font-medium tabular-nums">
                    {percFor('week1', 'top8')}%
                  </div>
                </div>
                <div className="flex items-center justify-between py-1 border-t">
                  <div>Champions</div>
                  <div className="text-right font-medium tabular-nums">
                    {percFor('week1', 'champions')}%
                  </div>
                </div>
              </div>
              {/* Week 2 compact card */}
              <div className="flex flex-col w-full">
                <div className="w-full text-right py-1 px-1 bg-muted/30 rounded-sm font-medium">
                  {w2Label}
                </div>
                <div className="flex items-center justify-between py-1">
                  <div>Total</div>
                  <div className="text-right font-medium tabular-nums">
                    {percFor('week2', 'total')}%
                  </div>
                </div>
                <div className="flex items-center justify-between py-1 border-t">
                  <div>Top 8</div>
                  <div className="text-right font-medium tabular-nums">
                    {percFor('week2', 'top8')}%
                  </div>
                </div>
                <div className="flex items-center justify-between py-1 border-t">
                  <div>Champions</div>
                  <div className="text-right font-medium tabular-nums">
                    {percFor('week2', 'champions')}%
                  </div>
                </div>
              </div>
            </div>
            <table className={cn('w-full text-sm hidden', '@[260px]/f-table:table')}>
              <thead>
                <tr className="text-xs text-muted-foreground">
                  <th className="text-left py-1 pl-0 pr-1">&nbsp;</th>
                  <th className="text-right py-1 px-1 bg-muted/30 rounded-sm">{w1Label}</th>
                  <th className="text-right py-1 px-1 bg-muted/30 rounded-sm">{w2Label}</th>
                </tr>
              </thead>
              <tbody className="[&_tr+tr]:border-t [&_tr+tr]:border-muted-foreground/20">
                <tr>
                  <td className="pl-0 pr-1 py-2">Total</td>
                  <td className="py-2 pr-1 text-right font-medium tabular-nums">
                    {percFor('week1', 'total')}%
                  </td>
                  <td className="py-2 text-right font-medium tabular-nums">
                    {percFor('week2', 'total')}%
                  </td>
                </tr>
                <tr>
                  <td className="pl-0 pr-1 py-2">Top 8</td>
                  <td className="py-2 pr-1 text-right font-medium tabular-nums">
                    {percFor('week1', 'top8')}%
                  </td>
                  <td className="py-2 text-right font-medium tabular-nums">
                    {percFor('week2', 'top8')}%
                  </td>
                </tr>
                <tr>
                  <td className="pl-0 pr-1 py-2">Champions</td>
                  <td className="py-2 pr-1 text-right font-medium tabular-nums">
                    {percFor('week1', 'champions')}%
                  </td>
                  <td className="py-2 text-right font-medium tabular-nums">
                    {percFor('week2', 'champions')}%
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default ForceVsNonforce;
