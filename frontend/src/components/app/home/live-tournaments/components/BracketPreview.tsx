import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge.tsx';
import { Button } from '@/components/ui/button.tsx';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible.tsx';
import { cn } from '@/lib/utils.ts';
import type { BracketRound } from '../liveTournamentUtils.ts';

export function BracketPreview({ rounds }: { rounds: BracketRound[] }) {
  const [open, setOpen] = useState(false);

  if (rounds.length === 0) return null;

  const matchCount = rounds.reduce((total, round) => total + round.matches.length, 0);

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="space-y-2">
      <CollapsibleTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="xs"
          className="h-7 justify-start px-2 text-xs font-medium uppercase text-muted-foreground"
        >
          Top cut
          <Badge variant="outline" className="rounded-md">
            {matchCount}
          </Badge>
          <ChevronDown className={cn('h-3 w-3 transition-transform', open && 'rotate-180')} />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="grid gap-2">
        {rounds.map(round => (
          <div key={round.roundName} className="rounded-md border bg-background p-2">
            <div className="mb-2 text-sm font-medium">{round.roundName}</div>
            <div className="space-y-1 text-xs">
              {round.matches.map(match => {
                const score =
                  match.match.player1GameWin !== null && match.match.player2GameWin !== null
                    ? `${match.match.player1GameWin}-${match.match.player2GameWin}`
                    : 'vs';

                return (
                  <div key={match.match.id} className="flex items-center justify-between gap-2">
                    <span className="min-w-0 flex-1 truncate">
                      {match.player1?.displayName ?? `Player ${match.match.playerId1}`}
                    </span>
                    <span className="shrink-0 text-muted-foreground">{score}</span>
                    <span className="min-w-0 flex-1 truncate text-right">
                      {match.player2?.displayName ??
                        (match.match.playerId2 ? `Player ${match.match.playerId2}` : 'Bye')}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}
