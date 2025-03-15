import React, { useMemo } from 'react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { cn } from '@/lib/utils';
import { useGetDeckCards } from '@/api/decks/useGetDeckCards.ts';

export interface BoardSelectProps {
  deckId: string;
  value: number;
  onChange: (value: number) => void;
}

const BoardSelect: React.FC<BoardSelectProps> = ({ deckId, value, onChange }) => {
  const { data: deckCardsData } = useGetDeckCards(deckId);

  const boardCardCounts = useMemo(() => {
    const counts: Record<number, number> = {
      1: 0,
      2: 0,
      3: 0,
    };

    (deckCardsData?.data ?? []).forEach(
      c => (counts[c.board] += c.quantity),
      [deckCardsData?.data],
    );

    return counts;
  }, [deckCardsData?.data]);

  return (
    <div className={cn('flex flex-wrap flex-grow items-center gap-2')}>
      <div className="flex items-center">
        <ToggleGroup
          type={'single'}
          value={value.toString()}
          onValueChange={v => onChange(Number(v))}
        >
          <ToggleGroupItem value="1">Maindeck ({boardCardCounts[1]})</ToggleGroupItem>
          <ToggleGroupItem value="2">Sideboard ({boardCardCounts[2]})</ToggleGroupItem>
          <ToggleGroupItem value="3">Maybeboard ({boardCardCounts[3]})</ToggleGroupItem>
        </ToggleGroup>
      </div>
    </div>
  );
};

export default BoardSelect;
