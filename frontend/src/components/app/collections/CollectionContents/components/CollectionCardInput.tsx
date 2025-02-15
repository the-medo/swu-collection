import * as React from 'react';
import { Input } from '@/components/ui/input.tsx';
import { CollectionCardIdentification } from '@/api/usePutCollectionCard.ts';
import { cn } from '@/lib/utils.ts';
import debounce from 'lodash.debounce';
import { useEffect } from 'react';

export type CollectionCardInputProps = {
  id: CollectionCardIdentification;
  key: string;
  wide?: boolean;
} & (
  | {
      field: 'amount';
      value: number;
      onChange: (id: CollectionCardIdentification, field: 'amount', value: number) => void;
    }
  | {
      field: 'amount2';
      value: number | undefined;
      onChange: (
        id: CollectionCardIdentification,
        field: 'amount2',
        value: number | undefined,
      ) => void;
    }
  | {
      field: 'note' | 'price';
      value: string | undefined;
      onChange: (
        id: CollectionCardIdentification,
        field: 'note' | 'price',
        value: string | undefined,
      ) => void;
    }
);

export type CollectionCardInputField = CollectionCardInputProps['field'];

const DEBOUNCE_DELAY = 500;

const CollectionCardInput: React.FC<CollectionCardInputProps> = ({
  id,
  key,
  field,
  wide = false,
  value,
  onChange,
}) => {
  const [inputValue, setInputValue] = React.useState<string | number | undefined>(value);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const debouncedOnChange = React.useMemo(
    () =>
      debounce((value: unknown) => {
        onChange(id, field as never, value as never);
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
      id={key}
      placeholder=""
      className={cn('h-8', {
        'px-1 pl-2 text-right': field !== 'note',
        'w-16': (field === 'amount' || field === 'amount2') && !wide,
        'w-24': field === 'price' && !wide,
        'w-full': wide,
      })}
      type={field === 'note' ? 'text' : 'number'}
      value={inputValue}
      onChange={handleChange}
    />
  );
};

export default CollectionCardInput;
