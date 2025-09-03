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
    <div className="h-full w-full flex flex-col gap-2">
      <div className="flex gap-2 justify-between items-center">
        <div className="flex items-center gap-2">
          <h3>Force vs Non-Force</h3>
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
        </div>
      </div>

      <div className="flex flex-wrap gap-4 items-start">
        {/* Left: Two-week summary */}
        <div className="flex flex-1 flex-col items-center gap-2">
          <div className="text-lg text-muted-foreground font-medium">Last 2 weeks</div>
          <div className="w-24 h-24">
            <ResponsivePie
              data={chartDataTwoWeeks}
              margin={{ top: 2, right: 2, bottom: 2, left: 2 }}
              innerRadius={0.8}
              padAngle={0}
              cornerRadius={0}
              activeOuterRadiusOffset={2}
              enableArcLabels={false}
              enableArcLinkLabels={false}
              isInteractive={false}
              colors={({ id }) => (id === 'Force' ? '#60A5FA' : '#D1D5DB')}
              layers={layersAny}
            />
          </div>
          <ul className="text-xs text-muted-foreground list-disc pl-4">
            <li>
              <span className="tabular-nums font-medium">{twoWeeksTotalForce}</span> out of{' '}
              <span className="tabular-nums font-medium">{twoWeeksTotal}</span> total ({twoWeeksPct}
              %)
            </li>
            <li>
              <span className="tabular-nums font-medium">{twoWeeksTop8Force}</span> out of{' '}
              <span className="tabular-nums font-medium">{twoWeeksTop8Total}</span> top 8 (
              {twoWeeksTop8Pct}%)
            </li>
            <li>
              <span className="tabular-nums font-medium">{twoWeeksChampForce}</span> out of{' '}
              <span className="tabular-nums font-medium">{twoWeeksChampTotal}</span> champions (
              {twoWeeksChampPct}%)
            </li>
          </ul>
        </div>

        {/* Right: By weekends table */}
        <div className="flex-1 min-w-[260px]">
          <div className="w-full text-center mb-2 text-lg text-muted-foreground font-medium">
            By weekends
          </div>
          <table className="w-full text-sm">
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
    </div>
  );
};

export default ForceVsNonforce;
