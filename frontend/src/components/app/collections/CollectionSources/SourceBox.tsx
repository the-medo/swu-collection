import * as React from 'react';
import type { CollectionSourceRow } from '@/api/collections/useGetCollectionSources.ts';
import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button.tsx';

interface SourceBoxProps {
  row: CollectionSourceRow;
  selected?: boolean;
  onSelect?: () => void;
}

const SourceBox: React.FC<SourceBoxProps> = ({ row, selected = false, onSelect }) => {
  const collectionId = row.collection.id;
  const userId = row.user.id;
  const userName = (row.user as any).displayName ?? (row.user as any).name ?? 'User';

  return (
    <div
      className={`border rounded-lg p-3 shadow-xs bg-card text-card-foreground flex items-center justify-between gap-4 ${selected ? 'border-primary ring-1 ring-primary' : 'hover:border-primary cursor-pointer'}`}
      onClick={onSelect}
      role={onSelect ? 'button' : undefined}
      aria-pressed={onSelect ? (selected ? 'true' : 'false') : undefined}
    >
      <div className="flex flex-col">
        <span className="font-medium">{row.collection.title}</span>
        <span className="text-xs text-muted-foreground">
          by{' '}
          <Link to={`/users/$userId`} params={{ userId }} className="underline hover:no-underline" onClick={e => e.stopPropagation()}>
            {userName}
          </Link>
        </span>
      </div>
      <Link to={`/collections/$collectionId`} params={{ collectionId }} onClick={e => e.stopPropagation()}>
        <Button size="sm" variant="secondary">
          Open
        </Button>
      </Link>
    </div>
  );
};

export default SourceBox;
