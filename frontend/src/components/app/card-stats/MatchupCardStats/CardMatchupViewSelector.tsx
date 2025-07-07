import * as React from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group.tsx';
import { useCallback } from 'react';
import { Route } from '@/routes/__root';

export type CardMatchupView = '1' | '2' | 'both-decks-together' | 'both-decks-divided';

export const cardMatchupViewArray: [CardMatchupView, ...CardMatchupView[]] = [
  '1',
  '2',
  'both-decks-together',
  'both-decks-divided',
] as const;

interface CardMatchupViewSelectorProps {
  value?: CardMatchupView;
  onChange?: (value: CardMatchupView) => void;
}

const CardMatchupViewSelector: React.FC<CardMatchupViewSelectorProps> = ({ value, onChange }) => {
  const { csCardMatchupView = '1' } = useSearch({ strict: false });
  const navigate = useNavigate({ from: Route.fullPath });

  const currentValue = value || csCardMatchupView as CardMatchupView;

  const onValueChange = useCallback(
    (v: string) => {
      if (v) {
        const newValue = v as CardMatchupView;
        if (onChange) {
          onChange(newValue);
        } else {
          navigate({
            search: prev => ({ ...prev, csCardMatchupView: newValue }),
          });
        }
      }
    },
    [navigate, onChange],
  );

  return (
    <ToggleGroup
      type="single"
      value={currentValue}
      onValueChange={onValueChange}
      className="justify-start gap-2 flex-wrap"
    >
      <ToggleGroupItem value="1">Main deck</ToggleGroupItem>
      <ToggleGroupItem value="2">Sideboard</ToggleGroupItem>
      <ToggleGroupItem value="both-decks-together">Main + sideboard</ToggleGroupItem>
      <ToggleGroupItem value="both-decks-divided">Main + sideboard separated</ToggleGroupItem>
    </ToggleGroup>
  );
};

export default CardMatchupViewSelector;