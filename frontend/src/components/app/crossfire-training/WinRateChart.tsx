import { CartesianGrid, Line, LineChart, ReferenceLine, Tooltip, XAxis, YAxis } from 'recharts';
import { ChartContainer } from '@/components/ui/chart.tsx';
import type { Score } from './lab-data.ts';
import { number, percent } from './format.ts';

export interface WinRatePoint {
  id: string;
  label: string;
  score: Score | null;
  modelHash?: string;
  reference?: string;
}
export default function WinRateChart({
  points,
  label,
  color,
}: {
  points: WinRatePoint[];
  label: string;
  color: string;
}) {
  const values = points.map(p => ({ ...p, winrate: p.score ? p.score.rate * 100 : null }));
  return (
    <ChartContainer
      config={{ winrate: { label, color } }}
      className="h-[240px] w-full"
      aria-label={label}
    >
      <LineChart
        data={values}
        margin={{ top: 10, right: 12, left: -20, bottom: 0 }}
        accessibilityLayer
      >
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={18} />
        <YAxis domain={[0, 100]} tickFormatter={v => `${v}%`} tickLine={false} axisLine={false} />
        <ReferenceLine y={50} stroke="var(--muted-foreground)" strokeDasharray="4 4" />
        <Tooltip
          content={({ active, payload }) => {
            const point = payload?.[0]?.payload as (typeof values)[number] | undefined;
            return active && point ? (
              <div className="max-w-xs rounded-lg border bg-background p-3 text-xs shadow-md">
                <strong>{point.label}</strong>
                <p>
                  {percent(point.score?.rate)} · {number(point.score?.wins)}/
                  {number(point.score?.games)} wins
                </p>
                <p>{number(point.score?.draws)} draws</p>
                {point.reference && <p>{point.reference}</p>}
              </div>
            ) : null;
          }}
        />
        <Line
          type="linear"
          dataKey="winrate"
          stroke="var(--color-winrate)"
          strokeWidth={2.5}
          dot={{ r: 3 }}
          activeDot={{ r: 5 }}
          isAnimationActive={false}
          connectNulls={false}
        />
      </LineChart>
    </ChartContainer>
  );
}
