import { ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils.ts';
import { competitionStyles } from '@/components/app/tournaments/competitionStyles.ts';
import TournamentDeckGroupIdentity from '../TournamentDecks/TournamentDeckGroupIdentity.tsx';
import { useChartColorsAndGradients } from './useChartColorsAndGradients.tsx';
import type { MetaInfo } from './MetaInfoSelector.tsx';
import type { MetaMapPoint } from './tournamentMetaMap.ts';

interface Props {
  point: MetaMapPoint & { name: string };
  metaInfo: MetaInfo;
  panel?: boolean;
}

export default function TournamentMetaMapDetails({ point, metaInfo, panel = false }: Props) {
  const gradient = useChartColorsAndGradients();
  const colors = gradient(point.key, metaInfo)
    .colors.map(stop => stop.color)
    .filter(Boolean);
  const accent = colors.length ? colors : ['hsl(var(--muted-foreground))'];

  return (
    <div
      className={cn(
        competitionStyles.meta,
        'overflow-hidden rounded-xl bg-card text-card-foreground',
        panel && 'border',
      )}
    >
      <div
        className="h-1"
        style={{
          background: `linear-gradient(90deg, ${[...accent, accent[accent.length - 1]].join(', ')})`,
        }}
      />
      <div className={cn('p-4', panel && 'sm:grid sm:grid-cols-2 sm:items-center sm:gap-6')}>
        <TournamentDeckGroupIdentity
          groupKey={point.key}
          metaInfo={metaInfo}
          fallbackName={point.name}
        />

        <div className={cn('mt-4 space-y-3', panel && 'sm:mt-0')}>
          <dl className="grid grid-cols-3 gap-1.5">
            {[
              { label: 'Win rate', value: `${point.x.toFixed(1)}%` },
              { label: 'Meta share', value: `${point.y.toFixed(1)}%` },
              { label: 'Occurrences', value: point.count.toLocaleString() },
            ].map(({ label, value }, index) => (
              <div
                key={label}
                className={cn(
                  'min-w-0 rounded-lg bg-muted/60 px-2 py-2.5',
                  index === 0 && 'bg-[var(--competition-soft)]',
                )}
              >
                <dt className="text-[10px] text-muted-foreground">{label}</dt>
                <dd
                  className={cn(
                    'mt-1 text-lg font-semibold leading-none tabular-nums',
                    index === 0 && 'text-[color:var(--competition-accent)]',
                  )}
                >
                  {value}
                </dd>
              </div>
            ))}
          </dl>
          <div>
            <div className="mb-1.5 flex justify-between gap-2 text-xs tabular-nums">
              <span>
                <strong>{point.wins.toLocaleString()}</strong> wins
              </span>
              <span className="text-muted-foreground">
                <strong>{point.losses.toLocaleString()}</strong> losses
              </span>
            </div>
            <div
              className="h-1.5 overflow-hidden rounded-full bg-muted-foreground/25"
              aria-hidden="true"
            >
              <div
                className="h-full rounded-full bg-[var(--competition-accent)]"
                style={{ width: `${point.x}%` }}
              />
            </div>
          </div>
        </div>
      </div>
      {!panel && (
        <div className="flex items-center justify-between border-t bg-muted/30 px-4 py-2.5 text-[11px] text-muted-foreground">
          <span>Select bubble to view decks</span>
          <ArrowUpRight className="size-3.5" aria-hidden="true" />
        </div>
      )}
    </div>
  );
}
