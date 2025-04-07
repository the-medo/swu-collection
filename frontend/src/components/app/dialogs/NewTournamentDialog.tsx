import Dialog, { DialogProps } from '@/components/app/global/Dialog.tsx';
import * as React from 'react';
import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { usePostTournament } from '@/api/tournaments/usePostTournament.ts';
import TournamentForm from '@/components/app/tournaments/TournamentForm.tsx';
import { ZTournamentCreateRequest } from '../../../../../types/ZTournament.ts';

type NewTournamentDialogProps = Pick<DialogProps, 'trigger' | 'triggerDisabled'>;

const NewTournamentDialog: React.FC<NewTournamentDialogProps> = ({ trigger, triggerDisabled }) => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const postTournamentMutation = usePostTournament();

  const handleSubmit = (data: ZTournamentCreateRequest) => {
    postTournamentMutation.mutate(data, {
      onSuccess: result => {
        setOpen(false);
        navigate({ to: `/tournaments/${result.data.id}` });
      },
    });
  };

  return (
    <Dialog
      trigger={trigger}
      triggerDisabled={triggerDisabled}
      header="New Tournament"
      open={open}
      onOpenChange={setOpen}
      contentClassName="md:min-w-[600px]"
      size="medium"
    >
      <TournamentForm onSubmit={handleSubmit} isSubmitting={postTournamentMutation.isPending} />
    </Dialog>
  );
};

export default NewTournamentDialog;
