import * as React from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog.tsx';
import TournamentDetailContent from '@/components/app/daily-snapshots/special-sections/TournamentDetailSection/TournamentDetailContent.tsx';

const TournamentDetailDialog: React.FC = () => {
  const search = useSearch({ strict: false });
  const navigate = useNavigate();
  const dialogTournamentId = search.dialogTournamentId;

  const closeDialog = () => {
    navigate({
      to: '.',
      search: prev => ({
        ...prev,
        dialogTournamentId: undefined,
        maDeckId: undefined,
      }),
    });
  };

  if (!dialogTournamentId) return null;

  return (
    <Dialog
      open={true}
      onOpenChange={open => {
        if (!open) closeDialog();
      }}
    >
      <DialogContent className="h-[calc(100vh-1rem)] max-h-[calc(100vh-1rem)] w-[calc(100vw-1rem)] max-w-none overflow-y-auto p-3 sm:h-[calc(100vh-3rem)] sm:max-h-[calc(100vh-3rem)] sm:w-[calc(100vw-3rem)] sm:p-4">
        <DialogTitle className="sr-only">Tournament detail</DialogTitle>
        <TournamentDetailContent tournamentId={dialogTournamentId} onClose={closeDialog} />
      </DialogContent>
    </Dialog>
  );
};

export default TournamentDetailDialog;
