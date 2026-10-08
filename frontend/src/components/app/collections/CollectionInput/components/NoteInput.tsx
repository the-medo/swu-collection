import * as React from 'react';
import { Input } from '@/components/ui/input.tsx';

interface NoteInputProps {
  id?: string;
  disabled?: boolean;
  value: string;
  onChange: (value: string) => void;
}

const NoteInput: React.FC<NoteInputProps> = ({ id = 'note-input', disabled, value, onChange }) => {
  return (
    <>
      <label htmlFor={id} className="font-semibold">
        Note
      </label>
      <Input
        id={id}
        name={id}
        placeholder=""
        type="text"
        value={value}
        disabled={disabled}
        onChange={e => onChange(e.target.value)}
      />
    </>
  );
};

export default NoteInput;
