import React from 'react';
import { Input } from '@/components/ui/input.tsx';

interface FinalInputProps {
  cardId: string;
}

const FinalInput: React.FC<FinalInputProps> = ({ cardId }) => {
  // Mockup component – can be replaced with real input/logic later
  return (
    <div className="flex items-center justify-end w-full">
      <Input type="text" className="w-full" value={cardId} />
    </div>
  );
};

export default FinalInput;
