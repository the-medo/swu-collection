import * as React from 'react';
import Dialog from '@/components/app/global/Dialog.tsx';
import { useCallback } from 'react';
import {
  useMatchupCardStatsStore,
  useMatchupCardStatsStoreActions,
} from './useMatchupCardStatsStore';
import CardMatchupDecks from './CardMatchupDecks';

type CardMatchupDecksDialogProps = {
  trigger: React.ReactNode;
  cardId: string;
  cardName: string;
  count: string;
  view: string;
};

const CardMatchupDecksDialog: React.FC<CardMatchupDecksDialogProps> = ({
  trigger,
  cardId,
  cardName,
  count,
  view,
}) => {
  const { overviewId, matchupStatDeckKey } = useMatchupCardStatsStore();
  const { setMatchupStatDeckKey } = useMatchupCardStatsStoreActions();

  const key = `${cardId}|${view}|${count}`;

  const onOpenChange = useCallback(
    (open: boolean) => {
      if (open) {
        setMatchupStatDeckKey(key);
      } else {
        setMatchupStatDeckKey(null);
      }
    },
    [cardId, count, view, setMatchupStatDeckKey],
  );

  const open = overviewId !== undefined && matchupStatDeckKey === key;

  return (
    <Dialog
      trigger={trigger}
      header={`Decks containing "${cardName}" (${count})`}
      size="large"
      onOpenChange={onOpenChange}
      open={open}
      contentClassName={`w-[100vw] h-[100vh] md:max-w-[90%] min-h-[90%]`}
    >
      {overviewId ? (
        <CardMatchupDecks overviewId={overviewId} matchupStatDeckKey={key} />
      ) : (
        'Overview ID is missing!'
      )}
    </Dialog>
  );
};

export default CardMatchupDecksDialog;
