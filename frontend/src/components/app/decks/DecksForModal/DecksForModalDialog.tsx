import * as React from 'react';
import Dialog from '@/components/app/global/Dialog.tsx';
import { useCallback } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import DecksForModal from './DecksForModal';
import { CardStatsParams } from '@/api/card-stats';

type DecksForModalDialogProps = {
  trigger: React.ReactNode;
  header: string;
} & CardStatsParams;

const DecksForModalDialog: React.FC<DecksForModalDialogProps> = ({ trigger, header, ...props }) => {
  const { modalDecksForModalOpen, modalCardDecksLeaderCardId, modalCardDecksBaseCardId } =
    useSearch({
      strict: false,
    });
  const navigate = useNavigate();

  const onOpenChange = useCallback(
    (open: boolean) => {
      void navigate({
        to: '.',
        search: prev => ({
          ...prev,
          modalDecksForModalOpen: open ? true : undefined,
          modalCardDecksLeaderCardId: open ? props.leaderCardId : undefined,
          modalCardDecksBaseCardId: open ? props.baseCardId : undefined,
          maDeckId: open ? prev.maDeckId : undefined,
        }),
      });
    },
    [navigate, props.leaderCardId, props.baseCardId],
  );

  const open =
    modalDecksForModalOpen === true &&
    (modalCardDecksLeaderCardId === props.leaderCardId ||
      modalCardDecksBaseCardId === props.baseCardId);

  return (
    <Dialog
      trigger={trigger}
      header={header}
      size="large"
      onOpenChange={onOpenChange}
      open={open}
      contentClassName={`w-screen h-screen md:max-w-[90%] min-h-[90%]`}
    >
      <DecksForModal {...props} />
    </Dialog>
  );
};

export default DecksForModalDialog;
