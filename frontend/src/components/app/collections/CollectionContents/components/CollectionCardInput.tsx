import * as React from 'react';
import { Input } from '@/components/ui/input.tsx';
import {
  CollectionCardIdentification,
  getCollectionCardIdentificationKey,
} from '@/api/usePutCollectionCard.ts';
import { cn } from '@/lib/utils.ts';
import debounce from 'lodash.debounce';
import { useEffect } from 'react';

export type CollectionCardInputProps = {
  id: CollectionCardIdentification;
} & (
  | {
      field: 'amount';
      value: number;
      onChange: (id: CollectionCardIdentification, field: 'amount', value: number) => void;
    }
  | {
      field: 'amount2' | 'price';
      value: number | undefined;
      onChange: (
        id: CollectionCardIdentification,
        field: 'amount2' | 'price',
        value: number | undefined,
      ) => void;
    }
  | {
      field: 'note';
      value: string;
      onChange: (id: CollectionCardIdentification, field: 'note', value: string) => void;
    }
);

export type CollectionCardInputField = CollectionCardInputProps['field'];

const DEBOUNCE_DELAY = 300;

const CollectionCardInput: React.FC<CollectionCardInputProps> = ({
  id,
  field,
  value,
  onChange,
}) => {
  const key = getCollectionCardIdentificationKey(id);
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
    const newValue =
      field === 'note' ? event.target.value : Number(event.target.value) || undefined;
    setInputValue(newValue);
    debouncedOnChange(newValue);

    /*if (field === 'note') {
      onChange(id, field, event.target.value);
    } else if (field === 'amount') {
      onChange(id, field, Number(event.target.value));
    } else {
      onChange(id, field, Number(event.target.value) || undefined);
    }*/
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
      className={cn({ 'w-12 px-1 pl-2': field !== 'note' })}
      type={field === 'note' ? 'text' : 'number'}
      value={inputValue}
      onChange={handleChange}
    />
  );
};

export default CollectionCardInput;
