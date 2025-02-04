import * as React from 'react';
import { Input } from '@/components/ui/input.tsx';

interface NoteInputProps {
  value: string;
  onChange: (value: string) => void;
}

const NoteInput: React.FC<NoteInputProps> = ({ value, onChange }) => {
  return (
    <>
      <label htmlFor="note-input" className="font-semibold">
        Note
      </label>
      <Input
        id="note-input"
        name="note-input"
        placeholder=""
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
      />
    </>
  );
};

export default NoteInput;
