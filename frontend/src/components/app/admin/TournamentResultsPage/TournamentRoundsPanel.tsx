import { useEffect, useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog.tsx';
import { Badge } from '@/components/ui/badge.tsx';
import { Button } from '@/components/ui/button.tsx';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table.tsx';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group.tsx';
import { toast } from '@/hooks/use-toast.ts';
import {
  useAdminTournamentMatches,
  useApplyAdminTournamentRoundMatches,
} from '@/api/admin/tournamentResults.ts';
import type { TournamentMatch } from '../../../../../../server/db/schema/tournament_match.ts';

interface TournamentRoundsPanelProps {
  tournamentId: string;
  requestedRound?: number;
  onRoundChange: (round: number) => void;
}

function describeResult(match: TournamentMatch): string {
  if (match.isBye) return 'Player one bye';
  if (match.result === 3) return 'Player one win';
  if (match.result === 1) return 'Draw';
  if (match.result === 0) return 'Player two win';
  return 'Unknown result';
}

export function TournamentRoundsPanel({
  tournamentId,
  requestedRound,
  onRoundChange,
}: TournamentRoundsPanelProps) {
  const { data, error, isLoading } = useAdminTournamentMatches(tournamentId);
  const applyRoundMatches = useApplyAdminTournamentRoundMatches(tournamentId);
  const matches = data?.data;
  const rounds = useMemo(
    () =>
      [...new Set((matches ?? []).map(match => match.round))].sort(
        (first, second) => first - second,
      ),
    [matches],
  );
  const newestRound = rounds[rounds.length - 1];
  const selectedRound =
    requestedRound !== undefined && rounds.includes(requestedRound) ? requestedRound : newestRound;

  useEffect(() => {
    if (selectedRound !== undefined && selectedRound !== requestedRound) {
      onRoundChange(selectedRound);
    }
  }, [onRoundChange, requestedRound, selectedRound]);

  if (isLoading) {
    return (
      <div className="rounded-md border p-6 text-sm text-muted-foreground">Loading rounds…</div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md border border-destructive p-6 text-sm text-destructive">
        {error.message}
      </div>
    );
  }

  if (rounds.length === 0 || selectedRound === undefined) {
    return (
      <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
        This tournament has no imported matches to inspect.
      </div>
    );
  }

  const roundMatches = (matches ?? []).filter(match => match.round === selectedRound);

  const handleApplyRoundMatches = async () => {
    try {
      const result = await applyRoundMatches.mutateAsync({ round: selectedRound });
      if (result.warnings.length > 0) {
        toast({
          title: `Round ${selectedRound} applied with warnings`,
          description: result.warnings.join(' '),
          variant: 'destructive',
        });
      } else {
        toast({
          title: `Round ${selectedRound} applied`,
          description: `${result.data.matchesApplied} matches updated ${result.data.standingsUpdated} standings.`,
        });
      }
    } catch (error) {
      toast({
        title: `Could not apply round ${selectedRound}`,
        description:
          error instanceof Error ? error.message : 'Failed to apply tournament match results.',
        variant: 'destructive',
      });
    }
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="overflow-x-auto pb-1">
          <ToggleGroup
            type="single"
            variant="outline"
            size="sm"
            value={selectedRound.toString()}
            onValueChange={value => {
              if (!value) return;
              onRoundChange(Number(value));
            }}
            className="w-max justify-start"
            aria-label="Tournament round"
          >
            {rounds.map(round => (
              <ToggleGroupItem key={round} value={round.toString()} aria-label={`Round ${round}`}>
                Round {round}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button disabled={applyRoundMatches.isPending || roundMatches.length === 0}>
              {applyRoundMatches.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Apply all matches
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Apply all matches from round {selectedRound}?</AlertDialogTitle>
              <AlertDialogDescription>
                This adds each player’s win, loss, or draw and points from the selected round to
                their standing. Placement will not change. Applying this round again adds the same
                results again.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => void handleApplyRoundMatches()}>
                Apply all matches
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Player one</TableHead>
              <TableHead className="text-right">P1 points</TableHead>
              <TableHead>Player two</TableHead>
              <TableHead className="text-right">P2 points</TableHead>
              <TableHead className="text-center">Game W–L–D</TableHead>
              <TableHead>Result</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {roundMatches.map(match => (
              <TableRow key={match.id}>
                <TableCell>{match.p1Username}</TableCell>
                <TableCell className="text-right">{match.p1Points}</TableCell>
                <TableCell>
                  {match.isBye ? (
                    <Badge variant="secondary">BYE</Badge>
                  ) : (
                    (match.p2Username ?? 'Unknown player')
                  )}
                </TableCell>
                <TableCell className="text-right">{match.p2Points ?? '—'}</TableCell>
                <TableCell className="text-center">
                  {match.gameWin}–{match.gameLose}–{match.gameDraw}
                </TableCell>
                <TableCell>{describeResult(match)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
