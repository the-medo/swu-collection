import React, { useCallback } from 'react';
import { Button } from '@/components/ui/button.tsx';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Image as ImageIcon } from 'lucide-react';
import { DeckImagePresetVariant } from '../../../../../../../../types/DeckImageCustomization.tsx';
import { useGetUserSetting } from '@/api/user/useGetUserSetting';
import { useSetUserSetting } from '@/api/user/useSetUserSetting';
import { cn } from '@/lib/utils.ts';

export interface DefaultVariantSelectorProps {
  value?: DeckImagePresetVariant;
  onChange?: (value: DeckImagePresetVariant) => void;
  fullWidth?: boolean;
}

const variantOptions: DeckImagePresetVariant[] = [
  DeckImagePresetVariant.Standard,
  DeckImagePresetVariant.Hyperspace,
  DeckImagePresetVariant.StandardPrestige,
];

const DefaultVariantSelector: React.FC<DefaultVariantSelectorProps> = ({
  value,
  onChange,
  fullWidth = false,
}) => {
  const { data: storeValue } = useGetUserSetting('deckImage_defaultVariantName');
  const { mutate: setSetting } = useSetUserSetting('deckImage_defaultVariantName');

  const selected = value !== undefined ? value : storeValue;

  const onValueChange = useCallback(
    (v: string) => {
      const newValue = v as DeckImagePresetVariant;
      if (onChange) {
        onChange(newValue);
      } else {
        setSetting(newValue);
      }
    },
    [onChange],
  );

  return (
    <DropdownMenu modal={true}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className={cn(`text-xs justify-between`, fullWidth ? 'w-full' : 'w-[200px]')}
        >
          <span className="text-[1.2em] font-semibold">Default variant:</span>{' '}
          {selected ?? 'Standard'}
          <ImageIcon className="h-4 w-4 ml-2" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuRadioGroup value={selected} onValueChange={onValueChange}>
          {variantOptions.map(v => (
            <DropdownMenuRadioItem key={v} value={v}>
              {v}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default DefaultVariantSelector;
