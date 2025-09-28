import React from 'react';
import { Button } from '@/components/ui/button.tsx';
import { ArrowRight } from 'lucide-react';

interface ActionRowProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
}

export const ActionSelectorRow: React.FC<ActionRowProps> = ({
  title,
  description,
  icon,
  onClick,
}) => (
  <div
    className="flex flex-row gap-2 bg-background p-2 rounded-md cursor-pointer items-center justify-between"
    onClick={onClick}
    role="button"
    tabIndex={0}
    onKeyDown={e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onClick();
      }
    }}
  >
    {icon}
    <div className="flex flex-col gap-2 flex-1">
      <h5 className="mb-0">{title}</h5>
      <span className="text-xs">{description}</span>
    </div>
    <Button size="icon" aria-label={`Go to ${title}`}>
      <ArrowRight className="h-4 w-4" />
    </Button>
  </div>
);
