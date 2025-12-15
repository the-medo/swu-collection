import * as React from 'react';
import { Input } from '@/components/ui/input.tsx';
import { CollectionCardIdentification } from '@/api/collections/usePutCollectionCard.ts';
import { cn } from '@/lib/utils.ts';
import debounce from 'lodash.debounce';
import { useEffect } from 'react';

export type CollectionCardInputField = 'amount' | 'amount2' | 'note' | 'price' | 'deckCardQuantity';

type CollectionCardInputVariantProps =
  | {
      id: CollectionCardIdentification;
      field: 'amount';
      value: number;
    }
  | {
      id: CollectionCardIdentification;
      field: 'amount2';
      value: number | undefined;
    }
  | {
      id: CollectionCardIdentification;
      field: 'note' | 'price';
      value: string | undefined;
    };
/*| {
      id?: undefined;
      field: 'deckCardQuantity';
      value: number | undefined;
    }*/

export type CollectionCardInputOnChange = (
  id: CollectionCardIdentification | undefined,
  field: CollectionCardInputField,
  value: string | number | undefined,
) => void;

export type CollectionCardInputProps = {
  inputId: string;
  wide?: boolean;
  ghost?: boolean;
  onChange: CollectionCardInputOnChange;
} & CollectionCardInputVariantProps;

const DEBOUNCE_DELAY = 500;

const CollectionCardInput: React.FC<CollectionCardInputProps> = ({
  id,
  inputId,
  field,
  wide = false,
  ghost = false,
  value,
  onChange,
}) => {
  const [inputValue, setInputValue] = React.useState<string | number | undefined>(value ?? '');

  useEffect(() => {
    setInputValue(value ?? '');
  }, [value]);

  const debouncedOnChange = React.useMemo(
    () =>
      debounce((value: unknown) => {
        // if (field === 'deckCardQuantity') {
        //   onChange(value as number);
        // } else {
        onChange(id, field as never, value as never);
        // }
      }, DEBOUNCE_DELAY),
    [id, field, onChange],
  );

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    let newValue = undefined;

    if (field === 'note' || field === 'price') {
      newValue = event.target.value;
    } else if (field === 'amount') {
      newValue = Number(event.target.value);
    } else {
      newValue = Number(event.target.value) || undefined;
    }
    setInputValue(newValue);
    debouncedOnChange(newValue);
  };

  useEffect(() => {
    return () => {
      debouncedOnChange.cancel();
    };
  }, [debouncedOnChange]);

  return (
    <Input
      id={inputId}
      placeholder=""
      className={cn('h-8', {
        'px-1 pl-2 text-right': field !== 'note',
        'w-16': (field === 'amount' || field === 'amount2') && !wide,
        'w-20': field === 'price' && !wide,
        'w-full': wide,
        'px-1 pl-1 text-right border-0': ghost,
      })}
      type={field === 'note' ? 'text' : 'number'}
      value={inputValue}
      onChange={handleChange}
    />
  );
};

export default CollectionCardInput;
