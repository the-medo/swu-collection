import * as React from 'react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group.tsx';

export type DeckPrivacy = 0 | 1 | 2; // 0 = Private, 1 = Public, 2 = Unlisted

export interface DeckPrivacySelectorProps {
  value: DeckPrivacy;
  onChange: (value: DeckPrivacy) => void;
  className?: string;
}

const DeckPrivacySelector: React.FC<DeckPrivacySelectorProps> = ({ value, onChange, className }) => {
  return (
    <ToggleGroup
      type="single"
      value={String(value)}
      onValueChange={(v: string) => {
        if (v !== '') {
          const num = Number(v) as DeckPrivacy;
          onChange(num);
        }
      }}
      className={className}
    >
      <ToggleGroupItem value="0">Private</ToggleGroupItem>
      <ToggleGroupItem value="1">Public</ToggleGroupItem>
      <ToggleGroupItem value="2">Unlisted</ToggleGroupItem>
    </ToggleGroup>
  );
};

export default DeckPrivacySelector;
