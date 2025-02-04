import * as React from 'react';
import { Input } from '@/components/ui/input.tsx';

interface DefaultAmountInputProps {
  value: number | undefined;
  onChange: (value: number) => void;
}

const AmountInput = React.forwardRef<HTMLInputElement, DefaultAmountInputProps>(
  ({ value, onChange }, ref) => {
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
            onChange={e => onChange(Number(e.target.value) || 1)}
          />
        </div>
      </>
    );
  },
);

export default AmountInput;
