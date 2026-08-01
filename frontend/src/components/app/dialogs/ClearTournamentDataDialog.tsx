import * as React from 'react';
import { useState } from 'react';
import { useForm } from '@tanstack/react-form';
import Dialog, { DialogProps } from '@/components/app/global/Dialog.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Label } from '@/components/ui/label.tsx';
import FormFieldError from '@/components/app/global/FormFieldError.tsx';
import { useClearTournamentData } from '@/api/tournaments/useClearTournamentData.ts';
import type { TournamentStringDate } from '../../../../../types/Tournament.ts';

type ClearTournamentDataDialogProps = Pick<
  DialogProps,
  'trigger' | 'triggerDisabled' | 'open' | 'onOpenChange'
> & {
  tournament: TournamentStringDate;
};

const ClearTournamentDataDialog: React.FC<ClearTournamentDataDialogProps> = ({
  trigger,
  triggerDisabled,
  open,
  onOpenChange,
  tournament,
}) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const clearTournamentData = useClearTournamentData(tournament.id);
  const dialogOpen = open ?? internalOpen;
  const setDialogOpen = onOpenChange ?? setInternalOpen;

  const form = useForm({
    defaultValues: { confirmationText: '' },
    onSubmit: async ({ value }) => {
      if (value.confirmationText !== 'CLEAR') return;

      clearTournamentData.mutate(undefined, {
        onSuccess: () => setDialogOpen(false),
      });
    },
  });

  return (
    <Dialog
      trigger={trigger}
      triggerDisabled={triggerDisabled}
      header={`Clear tournament data: ${tournament.name}`}
      open={dialogOpen}
      onOpenChange={setDialogOpen}
    >
      <div className="space-y-4">
        <p className="text-sm">
          This keeps the tournament itself, but permanently removes its imported matches, player
          standings, linked decks, deck cards, and computed statistics. The tournament will be
          marked as not imported and ready for a new import.
        </p>

        <form
          className="space-y-4"
          onSubmit={event => {
            event.preventDefault();
            event.stopPropagation();
            void form.handleSubmit();
          }}
        >
          <form.Field
            name="confirmationText"
            children={field => (
              <div className="space-y-2">
                <Label htmlFor={field.name}>Type "CLEAR" to confirm</Label>
                <Input
                  id={field.name}
                  placeholder="CLEAR"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={event => field.handleChange(event.target.value)}
                />
                <FormFieldError meta={field.state.meta} />
              </div>
            )}
          />

          <div className="flex justify-between">
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <form.Subscribe
              selector={state => ({
                confirmationText: state.values.confirmationText,
                isPending: clearTournamentData.isPending,
              })}
            >
              {({ confirmationText, isPending }) => (
                <Button
                  type="submit"
                  variant="destructive"
                  disabled={isPending || confirmationText !== 'CLEAR'}
                >
                  {isPending ? 'Clearing...' : 'Clear tournament data'}
                </Button>
              )}
            </form.Subscribe>
          </div>
        </form>
      </div>
    </Dialog>
  );
};

export default ClearTournamentDataDialog;
