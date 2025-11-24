import React from 'react';
import { ExpandedCardData } from '@/components/app/limited/CardPoolDeckDetail/CPContent/cpDeckContentLib.ts';

export interface CPTrashProps {
  trash?: ExpandedCardData[];
  className?: string;
}

const CPTrash: React.FC<CPTrashProps> = ({ trash, className }) => {
  return (
    <div className={`h-full rounded-lg border border-border bg-card p-3 text-xs opacity-80 ${className ?? ''}`}>
      <h3 className="text-sm font-semibold mb-2">Trash</h3>
      <pre className="text-xs whitespace-pre-wrap break-words">
        {trash?.map(c => `${c.cardId} (${c.location})`).join('\n') ?? ''}
      </pre>
    </div>
  );
};

export default CPTrash;
