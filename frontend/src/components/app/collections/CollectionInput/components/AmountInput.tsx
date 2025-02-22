import * as React from 'react';
import { Input } from '@/components/ui/input.tsx';

interface DefaultAmountInputProps {
  minValue?: number;
  maxValue?: number;
  value: number | undefined;
  onChange: (value: number | undefined) => void;
}

const AmountInput = React.forwardRef<HTMLInputElement, DefaultAmountInputProps>(
  ({ value, minValue, maxValue, onChange }, ref) => {
    return (
      <>
        <label htmlFor="amount-input" className="font-semibold">
          Amount
        </label>
        <div className="self-center">
          <Input
            ref={ref}
            id="amount-input"
            name="amount-input"
            placeholder=""
            // className="w-full"
            type="number"
            value={value}
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
