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
  value: string | number | null | undefined,
) => void | Promise<void>;

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
  const [draft, setDraft] = React.useState({
    inputValue: value ?? '',
    dirty: false,
    failed: false,
    revision: 0,
  });
  const [focused, setFocused] = React.useState(false);

  const debouncedOnChange = React.useMemo(
    () =>
      debounce(async (nextValue: string | number | null | undefined, revision: number) => {
        setDraft(current =>
          current.revision === revision ? { ...current, failed: false } : current,
        );
        try {
          await onChange(id, field, nextValue);
          setDraft(current =>
            current.revision === revision ? { ...current, dirty: false, failed: false } : current,
          );
        } catch {
          // The mutation displays the error. Keep the draft available for retry.
          setDraft(current =>
            current.revision === revision ? { ...current, failed: true } : current,
          );
        }
      }, DEBOUNCE_DELAY),
    [id, field, onChange],
  );

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    let newValue: string | number | null | undefined;

    if (field === 'note' || field === 'price') {
      newValue = event.target.value;
    } else if (field === 'amount') {
      newValue = Number(event.target.value);
    } else {
      newValue = event.target.value === '' ? null : Number(event.target.value);
    }
    const revision = draft.revision + 1;
    setDraft({ inputValue: newValue ?? '', dirty: true, failed: false, revision });
    debouncedOnChange(newValue, revision);
  };

  useEffect(() => {
    return () => {
      debouncedOnChange.cancel();
    };
  }, [debouncedOnChange]);

  return (
    <div className={wide ? 'w-full' : undefined}>
      <Input
        id={inputId}
        placeholder=""
        className={cn(
          'h-8',
          {
            'px-1 pl-2 text-right': field !== 'note',
            'w-16': (field === 'amount' || field === 'amount2') && !wide,
            'w-20': field === 'price' && !wide,
            'w-full': wide,
            'px-1 pl-1 text-right border-0': ghost,
          },
          draft.failed && 'border border-destructive focus-visible:ring-destructive',
        )}
        type={field === 'note' ? 'text' : 'number'}
        value={focused || draft.dirty ? draft.inputValue : (value ?? '')}
        aria-invalid={draft.failed || undefined}
        onChange={handleChange}
        onFocus={() => {
          if (!draft.dirty) setDraft(current => ({ ...current, inputValue: value ?? '' }));
          setFocused(true);
        }}
        onBlur={() => {
          setFocused(false);
          void debouncedOnChange.flush();
        }}
      />
      {draft.failed && (
        <button
          type="button"
          aria-label={`Retry saving ${field === 'amount' || field === 'amount2' ? 'quantity' : field}`}
          className="mt-1 block text-xs font-medium text-destructive underline underline-offset-2"
          onClick={() => {
            debouncedOnChange(
              field === 'amount2' && draft.inputValue === '' ? null : draft.inputValue,
              draft.revision,
            );
            void debouncedOnChange.flush();
          }}
        >
          Retry save
        </button>
      )}
    </div>
  );
};

export default CollectionCardInput;
