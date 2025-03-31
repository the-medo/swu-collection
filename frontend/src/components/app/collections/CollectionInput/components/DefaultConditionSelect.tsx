import { Info } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover.tsx';
import * as React from 'react';
import { CardCondition } from '../../../../../../../types/enums.ts';
import CardConditionSelect from '@/components/app/global/CardConditionSelect.tsx';
import { cardConditionArray } from '../../../../../../../types/iterableEnumInfo.ts';

interface DefaultConditionSelectProps {
  onChange: (v: CardCondition) => void;
  value: CardCondition;
}

const DefaultConditionSelect: React.FC<DefaultConditionSelectProps> = ({ value, onChange }) => {
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
            <ul>
              {cardConditionArray.map(l => (
                <li key={l.condition} className="flex items-center gap-2">
                  {l.condition} - {l.fullName}
                </li>
              ))}
            </ul>
          </PopoverContent>
        </Popover>
      </div>
    </>
  );
};

export default DefaultConditionSelect;
