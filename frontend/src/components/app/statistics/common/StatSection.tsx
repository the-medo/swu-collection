import { statisticsStyles } from '@/components/app/statistics/statisticsStyles';
import { cn } from '@/lib/utils.ts';

export interface StatSectionProps {
  label?: string;
  total?: number;
  wins?: number;
  losses?: number;
  draws?: number;
  winrate?: number;
  showWinLose?: boolean;
  variant?: 'vertical' | 'horizontal';
  percentageVariant?: 'vertical' | 'horizontal';
}

export function StatSection({
  label,
  total,
  wins = 0,
  losses = 0,
  draws = 0,
  winrate = 0,
  showWinLose = true,
  variant = 'vertical',
}: StatSectionProps) {
  const count = total ?? wins + losses + draws;
  return (
    <div
      className={cn(
        statisticsStyles.metric,
        variant === 'horizontal' && statisticsStyles.metricHorizontal,
      )}
    >
      {label && <span className={statisticsStyles.metricLabel}>{label}</span>}
      <div className={statisticsStyles.metricMain}>
        {showWinLose ? (
          <strong
            className={cn(
              statisticsStyles.metricValue,
              'flex flex-wrap items-baseline gap-x-2 gap-y-0.5 max-[639.01px]:gap-x-1',
            )}
          >
            <span className={statisticsStyles.recordWins}>
              <span className={statisticsStyles.recordNumber}>{wins}</span>
              <span className={statisticsStyles.recordSuffix}>W</span>
            </span>
            <span className={statisticsStyles.recordLosses}>
              <span className={statisticsStyles.recordNumber}>{losses}</span>
              <span className={statisticsStyles.recordSuffix}>L</span>
            </span>
            {draws > 0 && (
              <span className={statisticsStyles.recordDraws}>
                <span className={statisticsStyles.recordNumber}>{draws}</span>
                <span className={statisticsStyles.recordSuffix}>D</span>
              </span>
            )}
          </strong>
        ) : (
          <strong className={statisticsStyles.metricValue}>{count}</strong>
        )}
        {showWinLose && (
          <span
            className={statisticsStyles.rate}
            data-tone={
              count ? (winrate > 50 ? 'positive' : winrate < 50 ? 'negative' : 'draw') : undefined
            }
            aria-label={count ? `${winrate.toFixed(1)}% win rate` : 'No results'}
          >
            {count ? `${winrate.toFixed(1)}%` : '—'}
          </span>
        )}
      </div>
      {showWinLose && <span className={statisticsStyles.metricRecord}>{count} total</span>}
    </div>
  );
}
