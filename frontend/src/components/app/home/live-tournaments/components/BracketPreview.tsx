import { useState } from 'react';
import { GitFork } from 'lucide-react';
import { Button } from '@/components/ui/button.tsx';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog.tsx';
import type { BracketRound } from '../liveTournamentUtils.ts';
import { LiveBracketRounds } from './bracket-preview/LiveBracketRounds.tsx';

export function BracketPreview({ rounds }: { rounds: BracketRound[] }) {
  const [open, setOpen] = useState(false);

  if (rounds.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="xs"
          className="h-7 justify-start px-2 text-xs font-medium uppercase text-muted-foreground"
        >
          <GitFork className="rotate-270" />
          Top 8 bracket
        </Button>
      </DialogTrigger>
      <DialogContent className=" max-w-[96vw] w-[1200px] p-4 sm:p-6">
        <DialogHeader className="pr-8">
          <DialogTitle>Top 8 bracket</DialogTitle>
        </DialogHeader>
        <div className="max-h-[85vh] overflow-x-auto overflow-y-auto pb-1 scale-70 -m-[10%] xl:scale-80 xl:-m-[7%] 2xl:scale-90 2xl:-m-[4%]">
          <LiveBracketRounds rounds={rounds} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
