import Dialog, { DialogProps } from '@/components/app/global/Dialog.tsx';
import * as React from 'react';
import { useState } from 'react';
import { useImportMeleeTournament } from '@/api/tournaments/useImportMeleeTournament.ts';
import { Button } from '@/components/ui/button.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Label } from '@/components/ui/label.tsx';
import { useForm } from '@tanstack/react-form';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox.tsx';

type ImportMeleeTournamentDialogProps = Pick<
  DialogProps,
  'trigger' | 'triggerDisabled' | 'open' | 'onOpenChange'
> & {
  tournamentId: string;
  meleeId?: string | null;
};

const ImportMeleeTournamentDialog: React.FC<ImportMeleeTournamentDialogProps> = ({
  trigger,
  triggerDisabled,
  open,
  onOpenChange,
  tournamentId,
  meleeId,
}) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const [roundsError, setRoundsError] = useState<string | null>(null);
  const importMeleeMutation = useImportMeleeTournament(tournamentId);
  const dialogOpen = open ?? internalOpen;
  const setDialogOpen = onOpenChange ?? setInternalOpen;

  const form = useForm({
    defaultValues: {
      meleeId: meleeId || '',
      forcedRoundId: '',
      isFix: false,
      markAsImported: true,
      rounds: '',
    },
    onSubmit: async ({ value }) => {
      if (value.meleeId) {
        const roundInput = value.rounds.trim();
        const roundValues = roundInput ? roundInput.split(',').map(round => round.trim()) : [];

        if (roundValues.some(round => !/^[1-9]\d*$/.test(round))) {
          setRoundsError('Use positive round numbers separated by commas.');
          return;
        }

        setRoundsError(null);
        const rounds = roundValues.map(Number);

        importMeleeMutation.mutate(
          {
            meleeId: value.meleeId,
            isFix: value.isFix,
            forcedRoundId: value.forcedRoundId,
            markAsImported: value.markAsImported,
            rounds: rounds.length > 0 ? [...new Set(rounds)] : undefined,
          },
          {
            onSuccess: () => {
              setDialogOpen(false);
            },
          },
        );
      }
    },
  });

  return (
    <Dialog
      trigger={trigger}
      triggerDisabled={triggerDisabled}
      header="Import Tournament Data from Melee.gg"
      open={dialogOpen}
      onOpenChange={setDialogOpen}
    >
      <div className="space-y-4">
        <Alert variant="default">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Melee.gg Import</AlertTitle>
          <AlertDescription>
            This will import participants, decks, and results from a Melee.gg tournament. Any
            existing tournament data may be overwritten.
          </AlertDescription>
        </Alert>

        <form
          className="space-y-4"
          onSubmit={e => {
            e.preventDefault();
            e.stopPropagation();
            void form.handleSubmit();
          }}
        >
          <form.Field
            name="meleeId"
            children={field => (
              <div className="space-y-2">
                <Label htmlFor={field.name}>Melee.gg Tournament ID</Label>
                <Input
                  id={field.name}
                  placeholder="Enter Melee.gg tournament ID"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={e => field.handleChange(e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  You can find the tournament ID in the URL of the Melee.gg tournament page.
                </p>
              </div>
            )}
          />

          <form.Field
            name="markAsImported"
            children={field => (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id={field.name}
                    checked={field.state.value}
                    onBlur={field.handleBlur}
                    onCheckedChange={e => field.handleChange(!!e)}
                  />
                  <Label htmlFor={field.name}>Mark as imported</Label>
                </div>
                <p className="text-xs text-muted-foreground">
                  Do not mark as imported in case of manual changes later
                </p>
              </div>
            )}
          />

          <hr />

          <form.Field
            name="forcedRoundId"
            children={field => (
              <div className="space-y-2">
                <Label htmlFor={field.name}>Forced round ID</Label>
                <Input
                  id={field.name}
                  placeholder="For last available standings"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={e => field.handleChange(e.target.value)}
                />
              </div>
            )}
          />

          <div className="space-y-2">
            <form.Field
              name="rounds"
              children={field => (
                <>
                  <Label htmlFor={field.name}>Rounds to import</Label>
                  <Input
                    id={field.name}
                    placeholder="4, 5, 6, 7, 8, 12, 13, 14, 15, 16"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={e => {
                      setRoundsError(null);
                      field.handleChange(e.target.value);
                    }}
                    aria-invalid={!!roundsError}
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter comma-separated round numbers. Leave empty to import every round.
                  </p>
                  {roundsError && <p className="text-xs text-destructive">{roundsError}</p>}
                </>
              )}
            />
          </div>

          <form.Field
            name="isFix"
            children={field => (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id={field.name}
                    checked={field.state.value}
                    onBlur={field.handleBlur}
                    onCheckedChange={e => field.handleChange(!!e)}
                  />
                  <Label htmlFor={field.name}>Fix Mode</Label>
                </div>
                <p className="text-xs text-muted-foreground">
                  Enable this option to update or correct existing tournament data instead of
                  performing a full import.
                </p>
              </div>
            )}
          />

          <div className="flex justify-between">
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={importMeleeMutation.isPending || !form.state.values.meleeId}
            >
              {importMeleeMutation.isPending ? 'Importing...' : 'Import from Melee.gg'}
            </Button>
          </div>
        </form>
      </div>
    </Dialog>
  );
};

export default ImportMeleeTournamentDialog;
