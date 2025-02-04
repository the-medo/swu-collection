import { Info } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover.tsx';
import * as React from 'react';
import { Input } from '@/components/ui/input.tsx';

interface DefaultNoteInputProps {
  value: string;
  onChange: (value: string) => void;
}

const DefaultNoteInput: React.FC<DefaultNoteInputProps> = ({ value, onChange }) => {
  return (
    <>
      <div className="col-span-2 flex flex-col gap-2 justify-center self-center ">
        {/*<label htmlFor="default-note-input" className="font-semibold">
          Default note
        </label>*/}
        <Input
          id="default-note-input"
          name="default-note-input"
          placeholder="Default note"
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
        />
      </div>
      <div className="self-center">
        <Popover>
          <PopoverTrigger>
            <Info size={16} />
          </PopoverTrigger>
          <PopoverContent className="flex flex-col gap-2 text-sm">
            <h4>Default note</h4>
            <span>
              In case you already have this card version in this collection, you will be asked what
              to do with a note.
            </span>
          </PopoverContent>
        </Popover>
      </div>
    </>
  );
};

export default DefaultNoteInput;
