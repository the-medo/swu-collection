import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import * as React from 'react';
import { useCallback, useEffect, useMemo } from 'react';
import { useGetUserSetting } from '@/api/user/useGetUserSetting.ts';
import { useSetUserSetting } from '@/api/user/useSetUserSetting.ts';
import { cardPriceSourceInfo, CardPriceSourceType } from '../../../../../types/CardPrices.ts';

export interface PriceSourceCollectionSelectorProps {}

// Allows selecting how prices are displayed in collections/wantlists.
// Options: Hide, Cardmarket, TCGPlayer
const PriceSourceCollectionSelector: React.FC<PriceSourceCollectionSelectorProps> = ({}) => {
  const { data: currentValue } = useGetUserSetting('priceSourceTypeCollection');
  const { mutate: setValue } = useSetUserSetting('priceSourceTypeCollection');

  // Local state can be `hide` or one of the enum values
  const [value, setLocalValue] = React.useState<string | null>(null);

  useEffect(() => {
    // If no setting yet, treat as hide
    setLocalValue((currentValue as string | null | undefined) ?? null);
  }, [currentValue]);

  const options = useMemo(() => {
    const list: { id: string; label: string }[] = [{ id: 'hide', label: 'Hide' }];
    // Include enabled sources CardMarket and TCGPlayer
    const enabled = Object.values(cardPriceSourceInfo).filter(
      o =>
        o.enabled &&
        (o.id === CardPriceSourceType.CARDMARKET || o.id === CardPriceSourceType.TCGPLAYER),
    );
    enabled.forEach(o => list.push({ id: o.id, label: o.name }));
    return list;
  }, []);

  const onChangeHandler = useCallback(
    (v: string) => {
      setLocalValue(v === 'hide' ? null : v);
      // Persist: for hide store null, else store the enum value
      if (v === 'hide') {
        // @ts-ignore allow null storage for this setting
        setValue(null as unknown as CardPriceSourceType);
      } else {
        setValue(v as CardPriceSourceType);
      }
    },
    [setValue],
  );

  // Map internal null to 'hide' for Select value
  const selectValue = value ?? 'hide';

  return (
    <Select value={selectValue} onValueChange={onChangeHandler}>
      <SelectTrigger className="w-[300px]">
        <SelectValue placeholder="Display prices" />
      </SelectTrigger>
      <SelectContent>
        {options.map(opt => (
          <SelectItem key={opt.id} value={opt.id}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default PriceSourceCollectionSelector;
