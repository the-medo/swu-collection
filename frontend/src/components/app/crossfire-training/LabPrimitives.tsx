import { useId, type ReactNode } from 'react';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.tsx';
import { cn } from '@/lib/utils.ts';
import type { Score } from './lab-data.ts';
import { number, percent } from './format.ts';

export const fieldClass =
  'h-9 min-w-0 max-w-full rounded-md border bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
export function LabSection({
  title,
  description,
  actions,
  children,
  className,
  contentClassName,
  testId,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  testId?: string;
}) {
  const id = useId();
  return (
    <Card
      className={cn('min-w-0 overflow-hidden shadow-none', className)}
      role="region"
      aria-labelledby={id}
      data-testid={testId}
    >
      <CardHeader className="gap-2 pb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <CardTitle id={id} className="text-base">
            {title}
          </CardTitle>
          {actions}
        </div>
        {description && (
          <div className="text-sm leading-relaxed text-muted-foreground">{description}</div>
        )}
      </CardHeader>
      <CardContent className={cn('min-w-0', contentClassName)}>{children}</CardContent>
    </Card>
  );
}
export function MetricCard({
  title,
  value,
  detail,
}: {
  title: string;
  value: ReactNode;
  detail: ReactNode;
}) {
  return (
    <Card className="min-w-0 shadow-none">
      <CardContent className="p-4 sm:p-5">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {title}
        </p>
        <p className="mt-2 text-2xl font-semibold tabular-nums sm:text-3xl">{value}</p>
        <div className="mt-1 text-xs text-muted-foreground">{detail}</div>
      </CardContent>
    </Card>
  );
}
export function ProgressBar({
  label,
  completed,
  target,
}: {
  label: string;
  completed: number;
  target: number;
}) {
  const value = Math.max(0, Math.min(target, completed));
  return (
    <div
      className="h-2 overflow-hidden rounded-full bg-muted"
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={target || undefined}
      aria-valuenow={target ? value : undefined}
    >
      <div
        className={cn(
          'h-full rounded-full bg-primary transition-[width]',
          !target && 'w-1/3 animate-pulse',
        )}
        style={target ? { width: `${(value / target) * 100}%` } : undefined}
      />
    </div>
  );
}
export function RateChange({ value }: { value: number | null }) {
  if (value === null) return <span className="text-muted-foreground">—</span>;
  const Icon = value < 0 ? ArrowDown : ArrowUp;
  return (
    <span
      aria-label={`${value < 0 ? 'Down' : 'Up'} ${Math.abs(value * 100).toFixed(1)} percentage points`}
      className={cn(
        'inline-flex items-center gap-1 whitespace-nowrap font-medium tabular-nums',
        value > 0
          ? 'text-emerald-700 dark:text-emerald-400'
          : value < 0
            ? 'text-amber-700 dark:text-amber-400'
            : 'text-muted-foreground',
      )}
    >
      {value !== 0 && <Icon className="size-3" />}
      {Math.abs(value * 100).toFixed(1)} pp
    </span>
  );
}
export function ScoreValue({
  score,
  detail = true,
}: {
  score: Score | null | undefined;
  detail?: boolean;
}) {
  return (
    <div className="tabular-nums">
      <span className="font-semibold">{percent(score?.rate)}</span>
      {detail && score && (
        <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
          {number(score.wins)}/{number(score.games)} wins · {number(score.draws)} draws
        </span>
      )}
    </div>
  );
}
export function ModelHash({ hash }: { hash?: string | null }) {
  return (
    <span title={hash ?? undefined} className="break-all font-mono text-xs text-muted-foreground">
      {hash?.slice(0, 12) ?? 'Not saved yet'}
    </span>
  );
}
export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-lg border border-dashed p-5 text-sm leading-relaxed text-muted-foreground">
      {children}
    </p>
  );
}
export interface ComparisonRow {
  id: string;
  label: string;
  before?: Score | null;
  after?: Score | null;
  beforeNote?: string;
  afterNote?: string;
  comparable?: boolean;
}
export function ComparisonTable({
  rows,
  beforeLabel,
  afterLabel,
  onSelect,
  label = 'Result comparison',
  empty = 'No completed comparisons yet.',
}: {
  rows: ComparisonRow[];
  beforeLabel: string;
  afterLabel: string;
  onSelect?: (id: string) => void;
  label?: string;
  empty?: string;
}) {
  if (!rows.length) return <EmptyState>{empty}</EmptyState>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[530px] text-sm" aria-label={label}>
        <thead>
          <tr className="border-b text-left text-xs text-muted-foreground">
            <th scope="col" className="pb-3">
              Matchup
            </th>
            <th scope="col" className="pb-3 text-right">
              {beforeLabel}
            </th>
            <th scope="col" className="pb-3 text-right">
              {afterLabel}
            </th>
            <th scope="col" className="pb-3 text-right">
              Change
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={row.id} className="border-b align-top last:border-0">
              <th scope="row" className="py-3 pr-3 text-left font-medium">
                {onSelect ? (
                  <button
                    className="text-left underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    onClick={() => onSelect(row.id)}
                  >
                    {row.label}
                  </button>
                ) : (
                  row.label
                )}
              </th>
              <td className="p-3 text-right">
                <ScoreValue score={row.before} />
                {row.beforeNote && (
                  <span className="text-xs text-muted-foreground">{row.beforeNote}</span>
                )}
              </td>
              <td className="p-3 text-right">
                <ScoreValue score={row.after} />
                {row.afterNote && (
                  <span className="text-xs text-muted-foreground">{row.afterNote}</span>
                )}
              </td>
              <td className="py-3 text-right">
                <RateChange
                  value={
                    row.before && row.after && row.comparable !== false
                      ? row.after.rate - row.before.rate
                      : null
                  }
                />
                {row.comparable === false && (
                  <span className="block text-xs text-muted-foreground">Reference changed</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
