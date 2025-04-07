import Dialog, { DialogProps } from '@/components/app/global/Dialog.tsx';
import * as React from 'react';
import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useDeleteTournament } from '@/api/tournaments/useDeleteTournament.ts';
import { Button } from '@/components/ui/button.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Label } from '@/components/ui/label.tsx';
import { useForm } from '@tanstack/react-form';
import { TournamentStringDate } from '../../../../../types/Tournament.ts';

type DeleteTournamentDialogProps = Pick<DialogProps, 'trigger' | 'triggerDisabled'> & {
  tournament: TournamentStringDate;
};

const DeleteTournamentDialog: React.FC<DeleteTournamentDialogProps> = ({
  trigger,
  triggerDisabled,
  tournament,
}) => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const deleteTournamentMutation = useDeleteTournament();

  const form = useForm({
    defaultValues: {
      confirmationText: '',
    },
    onSubmit: async ({ value }) => {
      if (value.confirmationText === 'DELETE') {
        deleteTournamentMutation.mutate(tournament.id, {
          onSuccess: () => {
            setOpen(false);
            navigate({ to: '/tournaments' });
          },
        });
      }
    },
  });

  return (
    <Dialog
      trigger={trigger}
      triggerDisabled={triggerDisabled}
      header={`Delete Tournament: ${tournament.name}`}
      open={open}
      onOpenChange={setOpen}
    >
      <div className="space-y-4">
        <div className="text-sm">
          You are about to delete this tournament. All tournament data including linked decks and
          results will be permanently deleted. This action cannot be undone.
        </div>

        <form
          className="space-y-4"
          onSubmit={e => {
            e.preventDefault();
            e.stopPropagation();
            void form.handleSubmit();
          }}
        >
          <form.Field
            name="confirmationText"
            children={field => (
              <div className="space-y-2">
                <Label htmlFor={field.name}>Type "DELETE" to confirm</Label>
                <Input
                  id={field.name}
                  placeholder="DELETE"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={e => field.handleChange(e.target.value)}
                />
                {field.state.meta.errors?.length > 0 && (
                  <p className="text-sm text-destructive">{field.state.meta.errors[0]}</p>
                )}
              </div>
            )}
          />

          <div className="flex justify-between">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={
                deleteTournamentMutation.isPending ||
                form.state.values.confirmationText !== 'DELETE'
              }
            >
              {deleteTournamentMutation.isPending ? 'Deleting...' : 'Delete Tournament'}
            </Button>
          </div>
        </form>
      </div>
    </Dialog>
  );
};

export default DeleteTournamentDialog;
