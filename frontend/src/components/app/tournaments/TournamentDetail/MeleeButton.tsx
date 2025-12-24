import { Button } from '@/components/ui/button.tsx';
import { Trophy } from 'lucide-react';
import * as React from 'react';

interface MeleeButtonProps {
  meleeId: string;
}

const MeleeButton: React.FC<MeleeButtonProps> = ({ meleeId }) => {
  return (
    <a
      href={`https://melee.gg/Tournament/View/${meleeId}`}
      target="_blank"
      rel="noopener noreferrer"
    >
      <Button variant="outline" size="sm">
        <Trophy className="h-4 w-4 mr-2" />
        Melee.gg
      </Button>
    </a>
  );
};

export default MeleeButton;
