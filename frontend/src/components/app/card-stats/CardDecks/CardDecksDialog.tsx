import * as React from 'react';
import { CardStatsParams } from '@/api/card-stats';
import Dialog from '@/components/app/global/Dialog.tsx';
import CardDecks from '@/components/app/card-stats/CardDecks/CardDecks.tsx';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { Route } from '@/routes/__root.tsx';
import { useCallback } from 'react';

type CardDecksDialogProps = {
  trigger: React.ReactNode;
  cardId: string;
  cardName: string;
} & CardStatsParams;

const CardDecksDialog: React.FC<CardDecksDialogProps> = ({
  trigger,
  cardId,
  cardName,
  ...props
}) => {
  const { modalCardDecksId, modalCardDecksLeaderCardId, modalCardDecksBaseCardId } = useSearch({
    strict: false,
  });
  const navigate = useNavigate({ from: Route.fullPath });

  const onOpenChange = useCallback(
    (open: boolean) => {
      void navigate({
        search: prev => ({
          ...prev,
          modalCardDecksId: open ? cardId : undefined,
          modalCardDecksLeaderCardId: open ? props.leaderCardId : undefined,
          modalCardDecksBaseCardId: open ? props.baseCardId : undefined,
          maDeckId: open ? prev.maDeckId : undefined,
        }),
      });
    },
    [cardId],
  );

  const open =
    modalCardDecksId === cardId &&
    modalCardDecksLeaderCardId === props.leaderCardId &&
    modalCardDecksBaseCardId === props.baseCardId;

  return (
    <Dialog
      trigger={trigger}
      header={`Decks containing "${cardName}"`}
      size="large"
      onOpenChange={onOpenChange}
      open={open}
      contentClassName={`w-[100vw] h-[100vh] md:max-w-[90%] min-h-[90%]`}
    >
      <CardDecks cardId={cardId} {...props} />
    </Dialog>
  );
};

export default CardDecksDialog;
