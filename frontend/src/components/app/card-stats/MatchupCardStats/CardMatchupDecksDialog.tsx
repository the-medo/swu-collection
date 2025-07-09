import * as React from 'react';
import Dialog from '@/components/app/global/Dialog.tsx';
import { useCallback } from 'react';
import {
  useMatchupCardStatsStore,
  useMatchupCardStatsStoreActions,
} from './useMatchupCardStatsStore';
import CardMatchupDecks from './CardMatchupDecks';
import { useNavigate } from '@tanstack/react-router';
import { Route } from '@/routes/__root.tsx';
import { cardMatchupViewLabels } from '@/components/app/card-stats/MatchupCardStats/CardMatchupOverview.tsx';
import { CardMatchupView } from './CardMatchupViewSelector';

type CardMatchupDecksDialogProps = {
  trigger: React.ReactNode;
  cardId: string;
  cardName: string;
  count: string;
  view: CardMatchupView;
};

const CardMatchupDecksDialog: React.FC<CardMatchupDecksDialogProps> = ({
  trigger,
  cardId,
  cardName,
  count,
  view,
}) => {
  const navigate = useNavigate({ from: Route.fullPath });
  const { overviewId, matchupStatDeckKey } = useMatchupCardStatsStore();
  const { setMatchupStatDeckKey } = useMatchupCardStatsStoreActions();

  const key = `${cardId}|${view}|${count}`;

  const onOpenChange = useCallback(
    (open: boolean) => {
      if (open) {
        setMatchupStatDeckKey(key);
      } else {
        setMatchupStatDeckKey(null);
        navigate({
          search: prev => ({
            ...prev,
            csDeckId: undefined,
          }),
        });
      }
    },
    [key, setMatchupStatDeckKey],
  );

  const open = overviewId !== null && matchupStatDeckKey === key;

  const notContaining = count === '0' || count === '0+0';
  const header = `Decks ${notContaining ? 'not containing' : 'containing'} "${cardName}" in ${cardMatchupViewLabels[view]} ${notContaining ? '' : `(${count})`}`;

  return (
    <Dialog
      trigger={trigger}
      header={header}
      size="large"
      onOpenChange={onOpenChange}
      open={open}
      contentClassName={`w-[100vw] h-[100vh] md:max-w-[90%] min-h-[90%]`}
    >
      {overviewId ? (
        <CardMatchupDecks overviewId={overviewId} matchupStatDeckKey={key} cardId={cardId} />
      ) : (
        'Overview ID is missing!'
      )}
    </Dialog>
  );
};

export default CardMatchupDecksDialog;
