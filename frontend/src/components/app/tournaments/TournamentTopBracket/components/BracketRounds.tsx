import { MoveHorizontal, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { roundName, winnerUsername, type BracketMatch } from '../bracketModel';
import BracketMatchCard, { type BracketInteractionProps } from './BracketMatchCard';

const gap = 24;
const rowHeight = 176;
export default function BracketRounds({
  bracket,
  ...interaction
}: BracketInteractionProps & { bracket: BracketMatch[][] }) {
  const columnWidth = 250;
  const height = Math.max(
    ...bracket.map((round, i) => round.length * 2 ** i * rowHeight),
    rowHeight,
  );
  const width = bracket.length * columnWidth + (bracket.length - 1) * gap;
  const hasDecks = bracket.some(round =>
    round.some(entry => entry.player1?.deck || entry.player2?.deck),
  );
  return (
    <div className="min-w-0">
      <p className="mb-3 flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <MoveHorizontal className="size-3.5 shrink-0" /> Scroll to explore rounds
        {hasDecks && ' · Select a player to view their deck'}
      </p>
      <div
        className="overflow-x-auto rounded-xl border bg-muted/20 p-3"
        tabIndex={0}
        role="region"
        aria-label="Elimination bracket, scroll horizontally for later rounds"
      >
        <div className="relative mx-auto" style={{ width }}>
          <svg
            className="pointer-events-none absolute left-0 top-9 text-border"
            width={width}
            height={height}
            aria-hidden="true"
          >
            {bracket.slice(0, -1).flatMap((round, r) =>
              round.map((entry, m) => {
                const winner = winnerUsername(entry);
                const next = winner
                  ? bracket[r + 1].findIndex(
                      e => e.match.p1Username === winner || e.match.p2Username === winner,
                    )
                  : -1;
                if (next < 0) return null;
                const x = r * (columnWidth + gap) + columnWidth;
                const y = (m + 0.5) * 2 ** r * rowHeight;
                const nextY = (next + 0.5) * 2 ** (r + 1) * rowHeight;
                return (
                  <path
                    key={entry.match.id}
                    d={`M ${x} ${y} H ${x + gap / 2} V ${nextY} H ${x + gap}`}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={interaction.highlightedPlayer === winner ? 2 : 1.5}
                    className={cn(interaction.highlightedPlayer === winner && 'text-primary')}
                  />
                );
              }),
            )}
          </svg>
          <div className="relative flex" style={{ gap }}>
            {bracket.map((round, r) => (
              <section key={r} style={{ width: columnWidth }} className="shrink-0">
                <div className="flex h-9 items-start justify-between">
                  <span className="flex items-center gap-2 text-xs font-semibold">
                    {r === bracket.length - 1 && <Trophy className="size-3.5 text-primary" />}
                    {roundName(r, bracket.length)}
                  </span>
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {String(r + 1).padStart(2, '0')}
                  </span>
                </div>
                {round.length ? (
                  round.map(entry => (
                    <div
                      key={entry.match.id}
                      className="flex items-center"
                      style={{ height: 2 ** r * rowHeight }}
                    >
                      <BracketMatchCard entry={entry} {...interaction} className="w-full" />
                    </div>
                  ))
                ) : (
                  <p className="py-10 text-center text-xs text-muted-foreground">
                    Round data unavailable
                  </p>
                )}
              </section>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
