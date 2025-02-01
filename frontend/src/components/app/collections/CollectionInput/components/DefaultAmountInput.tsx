import { Info } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover.tsx';
import * as React from 'react';
import { Input } from '@/components/ui/input.tsx';

interface DefaultAmountInputProps {
  value: number | undefined;
  onChange: (value: number | undefined) => void;
}

const DefaultAmountInput: React.FC<DefaultAmountInputProps> = ({ value, onChange }) => {
  return (
    <>
      <div className="self-center">
        <Input
          id="amount-input"
          name="amount-input"
          placeholder=""
          className="w-12 px-1 pl-2"
          type="number"
          value={value}
          onChange={e => onChange(Number(e.target.value) || undefined)}
        />
      </div>
      <div className="flex flex-col justify-center self-center">
        <label htmlFor="amount-input" className="font-semibold">
          Default amount
        </label>
      </div>
      <div className="self-center">
        <Popover>
          <PopoverTrigger>
            <Info size={16} />
          </PopoverTrigger>
          <PopoverContent className="flex flex-col gap-2 text-sm">
            <h4>Default amount</h4>
            <span>
              When default is set, amount input box will be skipped after selecting the card and
              always prefilled with this number.
            </span>
            <span>Empty or 0 means no default</span>
          </PopoverContent>
        </Popover>
      </div>
    </>
  );
};

export default DefaultAmountInput;
