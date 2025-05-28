import * as React from 'react';
import { CardStatsParams } from '@/api/card-stats';
import Dialog from '@/components/app/global/Dialog.tsx';
import CardDecks from '@/components/app/card-stats/CardDecks/CardDecks.tsx';

type CardDecksDialogProps = {
  trigger: React.ReactNode;
  cardId: string;
} & CardStatsParams;

const CardDecksDialog: React.FC<CardDecksDialogProps> = ({ trigger, ...props }) => {
  return (
    <Dialog
      trigger={trigger}
      header="Decks containing this card"
      size="large"
      contentClassName={`w-[100vw] h-[100vh] md:max-w-[90%] min-h-[90%]`}
      // contentClassName="min-h-[300px]"
    >
      <CardDecks {...props} />
    </Dialog>
  );
};

export default CardDecksDialog;
