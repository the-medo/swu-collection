import { FormEvent, useState } from 'react';
import { Loader2, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button.tsx';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Label } from '@/components/ui/label.tsx';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table.tsx';
import { toast } from '@/hooks/use-toast.ts';
import {
  type AdminTournamentStanding,
  type TournamentStandingUpdate,
  useAdminTournamentStandings,
  useUpdateAdminTournamentStanding,
} from '@/api/admin/tournamentResults.ts';

interface TournamentStandingsPanelProps {
  tournamentId: string;
}

interface StandingFormValues {
  placement: string;
  recordWin: string;
  recordLose: string;
  recordDraw: string;
  points: string;
}

function toFormValues(standing: AdminTournamentStanding): StandingFormValues {
  const row = standing.tournamentDeck;
  return {
    placement: row.placement?.toString() ?? '',
    recordWin: row.recordWin.toString(),
    recordLose: row.recordLose.toString(),
    recordDraw: row.recordDraw.toString(),
    points: row.points.toString(),
  };
}

function parseInteger(value: string, label: string, allowEmpty = false): number | null {
  const trimmed = value.trim();
  if (allowEmpty && !trimmed) return null;
  if (!trimmed) {
    throw new Error(`${label} is required.`);
  }

  const parsed = Number(trimmed);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`${label} must be a non-negative whole number.`);
  }

  return parsed;
}

function parseFormValues(values: StandingFormValues): TournamentStandingUpdate {
  const placement = parseInteger(values.placement, 'Placement', true);
  if (placement !== null && placement < 1) {
    throw new Error('Placement must be at least 1 or left blank.');
  }

  return {
    placement,
    recordWin: parseInteger(values.recordWin, 'Wins') as number,
    recordLose: parseInteger(values.recordLose, 'Losses') as number,
    recordDraw: parseInteger(values.recordDraw, 'Draws') as number,
    points: parseInteger(values.points, 'Points') as number,
  };
}

function getDeckLabel(standing: AdminTournamentStanding) {
  return standing.deck?.name || `Deck ${standing.tournamentDeck.deckId.slice(0, 8)}`;
}

export function TournamentStandingsPanel({ tournamentId }: TournamentStandingsPanelProps) {
  const { data, error, isLoading } = useAdminTournamentStandings(tournamentId);
  const updateStanding = useUpdateAdminTournamentStanding(tournamentId);
  const [selectedStanding, setSelectedStanding] = useState<AdminTournamentStanding>();
  const [formValues, setFormValues] = useState<StandingFormValues>();
  const [formError, setFormError] = useState<string>();

  const openEditor = (standing: AdminTournamentStanding) => {
    setSelectedStanding(standing);
    setFormValues(toFormValues(standing));
    setFormError(undefined);
  };

  const closeEditor = () => {
    if (updateStanding.isPending) return;
    setSelectedStanding(undefined);
    setFormValues(undefined);
    setFormError(undefined);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedStanding || !formValues) return;

    let values: TournamentStandingUpdate;
    try {
      values = parseFormValues(formValues);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Please enter valid standing values.');
      return;
    }

    try {
      const result = await updateStanding.mutateAsync({
        deckId: selectedStanding.tournamentDeck.deckId,
        values,
      });
      closeEditor();

      if (result.warnings.length > 0) {
        toast({
          title: 'Standing saved with warnings',
          description: result.warnings.join(' '),
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Standing saved',
          description: 'Tournament standings and related statistics have been refreshed.',
        });
      }
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Failed to save the standing.');
    }
  };

  if (isLoading) {
    return (
      <div className="rounded-md border p-6 text-sm text-muted-foreground">Loading standings…</div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md border border-destructive p-6 text-sm text-destructive">
        {error.message}
      </div>
    );
  }

  const standings = data?.data ?? [];

  if (standings.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
        This tournament has no imported standings to manage.
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Placement</TableHead>
              <TableHead>Player</TableHead>
              <TableHead>Deck</TableHead>
              <TableHead className="text-center">Record</TableHead>
              <TableHead className="text-right">Points</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {standings.map(standing => {
              const row = standing.tournamentDeck;
              return (
                <TableRow key={row.deckId}>
                  <TableCell className="font-medium">{row.placement ?? '—'}</TableCell>
                  <TableCell>{row.meleePlayerUsername || 'Unknown player'}</TableCell>
                  <TableCell className="max-w-64 truncate" title={getDeckLabel(standing)}>
                    {getDeckLabel(standing)}
                  </TableCell>
                  <TableCell className="text-center">
                    {row.recordWin}–{row.recordLose}–{row.recordDraw}
                  </TableCell>
                  <TableCell className="text-right">{row.points}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => openEditor(standing)}>
                      <Pencil className="h-4 w-4" />
                      <span className="sr-only">Edit standing</span>
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!selectedStanding} onOpenChange={open => !open && closeEditor()}>
        <DialogContent>
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>Edit tournament standing</DialogTitle>
              <DialogDescription>
                {selectedStanding?.tournamentDeck.meleePlayerUsername || 'Unknown player'} ·{' '}
                {selectedStanding ? getDeckLabel(selectedStanding) : ''}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="standing-placement">Placement</Label>
                <Input
                  id="standing-placement"
                  type="number"
                  min={1}
                  step={1}
                  value={formValues?.placement ?? ''}
                  onChange={event =>
                    setFormValues(previous =>
                      previous ? { ...previous, placement: event.target.value } : previous,
                    )
                  }
                  placeholder="Unknown"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="standing-points">Points</Label>
                <Input
                  id="standing-points"
                  type="number"
                  min={0}
                  step={1}
                  required
                  value={formValues?.points ?? ''}
                  onChange={event =>
                    setFormValues(previous =>
                      previous ? { ...previous, points: event.target.value } : previous,
                    )
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="standing-wins">Wins</Label>
                <Input
                  id="standing-wins"
                  type="number"
                  min={0}
                  step={1}
                  required
                  value={formValues?.recordWin ?? ''}
                  onChange={event =>
                    setFormValues(previous =>
                      previous ? { ...previous, recordWin: event.target.value } : previous,
                    )
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="standing-losses">Losses</Label>
                <Input
                  id="standing-losses"
                  type="number"
                  min={0}
                  step={1}
                  required
                  value={formValues?.recordLose ?? ''}
                  onChange={event =>
                    setFormValues(previous =>
                      previous ? { ...previous, recordLose: event.target.value } : previous,
                    )
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="standing-draws">Draws</Label>
                <Input
                  id="standing-draws"
                  type="number"
                  min={0}
                  step={1}
                  required
                  value={formValues?.recordDraw ?? ''}
                  onChange={event =>
                    setFormValues(previous =>
                      previous ? { ...previous, recordDraw: event.target.value } : previous,
                    )
                  }
                />
              </div>
            </div>

            {formError && <p className="pb-3 text-sm text-destructive">{formError}</p>}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={closeEditor}
                disabled={updateStanding.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={updateStanding.isPending}>
                {updateStanding.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Save standing
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
