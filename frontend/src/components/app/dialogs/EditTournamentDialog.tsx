import Dialog, { DialogProps } from '@/components/app/global/Dialog.tsx';
import * as React from 'react';
import { useState } from 'react';
import { usePutTournament } from '@/api/tournaments/usePutTournament.ts';
import TournamentForm from '@/components/app/tournaments/TournamentForm.tsx';
import { ZTournamentUpdateRequest } from '../../../../../types/ZTournament.ts';
import { TournamentStringDate } from '../../../../../types/Tournament.ts';

type EditTournamentDialogProps = Pick<
  DialogProps,
  'trigger' | 'triggerDisabled' | 'open' | 'onOpenChange'
> & {
  tournament: TournamentStringDate;
};

const EditTournamentDialog: React.FC<EditTournamentDialogProps> = ({
  trigger,
  triggerDisabled,
  open,
  onOpenChange,
  tournament,
}) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const putTournamentMutation = usePutTournament(tournament.id);
  const dialogOpen = open ?? internalOpen;
  const setDialogOpen = onOpenChange ?? setInternalOpen;

  const handleSubmit = (data: ZTournamentUpdateRequest) => {
    putTournamentMutation.mutate(data, {
      onSuccess: () => {
        setDialogOpen(false);
      },
    });
  };

  return (
    <Dialog
      trigger={trigger}
      triggerDisabled={triggerDisabled}
      header={`Edit Tournament: ${tournament.name}`}
      open={dialogOpen}
      onOpenChange={setDialogOpen}
      contentClassName="md:min-w-[600px]"
      size="medium"
    >
      <TournamentForm
        initialData={tournament}
        onSubmit={handleSubmit}
        isSubmitting={putTournamentMutation.isPending}
      />
    </Dialog>
  );
};

export default EditTournamentDialog;
