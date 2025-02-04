import { Info } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover.tsx';
import * as React from 'react';
import CardLanguageSelect from '@/components/app/global/CardLanguageSelect.tsx';
import { CardLanguage } from '../../../../../../../types/enums.ts';
import { languageArray } from '../../../../../../../types/iterableEnumInfo.ts';

interface DefaultLanguageSelectProps {
  onChange: (v: CardLanguage | null) => void;
  value?: CardLanguage | null;
}

const DefaultLanguageSelect: React.FC<DefaultLanguageSelectProps> = ({ value, onChange }) => {
  return (
    <>
      <div className="col-span-2 flex flex-row gap-4 items-center self-center">
        <CardLanguageSelect value={value} onChange={onChange} showFullName={true} />
      </div>
      <div className="self-center">
        <Popover>
          <PopoverTrigger>
            <Info size={16} />
          </PopoverTrigger>
          <PopoverContent className="flex flex-col gap-2 text-sm">
            <h4>Default language</h4>
            <span>Currently, SWU is printed in 5 languages:</span>

            {languageArray.map(l => (
              <div className="flex items-center gap-2">
                <img src={l.flag} alt="en-flag" className="w-6" />
                {l.language} - {l.fullName}
              </div>
            ))}
          </PopoverContent>
        </Popover>
      </div>
    </>
  );
};

export default DefaultLanguageSelect;
