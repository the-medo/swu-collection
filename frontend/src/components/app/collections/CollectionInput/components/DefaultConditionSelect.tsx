import { Info } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover.tsx';
import * as React from 'react';
import { CardCondition } from '../../../../../../../types/enums.ts';
import CardConditionSelect from '@/components/app/global/CardConditionSelect.tsx';
import { cardConditionArray } from '../../../../../../../types/iterableEnumInfo.ts';
import { SelectItem } from '@/components/ui/select.tsx';

interface DefaultLanguageSelectProps {
  onChange: (v: CardCondition) => void;
  value: CardCondition;
}

const DefaultLanguageSelect: React.FC<DefaultLanguageSelectProps> = ({ value, onChange }) => {
  return (
    <>
      <div className="col-span-2 flex flex-row gap-4 items-center self-center">
        <CardConditionSelect
          value={value}
          onChange={onChange}
          showFullName={true}
          emptyOption={false}
        />
      </div>
      <div className="self-center">
        <Popover>
          <PopoverTrigger>
            <Info size={16} />
          </PopoverTrigger>
          <PopoverContent className="flex flex-col gap-2 text-sm">
            <h4>Default card condition</h4>
            <span>
              {cardConditionArray.map(l => (
                <SelectItem key={l.condition} value={l.condition.toString()}>
                  {l.condition} - ${l.fullName}
                </SelectItem>
              ))}
            </span>
          </PopoverContent>
        </Popover>
      </div>
    </>
  );
};

export default DefaultLanguageSelect;
