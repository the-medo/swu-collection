import * as React from 'react';
import { Input } from '@/components/ui/input.tsx';

interface DefaultAmountInputProps {
  id?: string;
  disabled?: boolean;
  minValue?: number;
  maxValue?: number;
  value: number | undefined;
  onChange: (value: number | undefined) => void;
}

const AmountInput = React.forwardRef<HTMLInputElement, DefaultAmountInputProps>(
  ({ id = 'amount-input', disabled, value, minValue, maxValue, onChange }, ref) => {
    return (
      <>
        <label htmlFor={id} className="font-semibold">
          Amount
        </label>
        <div className="self-center">
          <Input
            ref={ref}
            id={id}
            name={id}
            placeholder=""
            // className="w-full"
            type="number"
            value={value ?? ''}
            disabled={disabled}
            min={minValue}
            max={maxValue}
            onChange={e => onChange(Number(e.target.value) || undefined)}
          />
        </div>
      </>
    );
  },
);

export default AmountInput;
