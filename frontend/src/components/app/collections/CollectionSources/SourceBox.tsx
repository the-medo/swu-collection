import * as React from 'react';
import type { CollectionSourceRow } from '@/api/collections/useGetCollectionSources.ts';
import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button.tsx';
import { UserDisplay } from '@/components/app/global/UserDisplay.tsx';

interface SourceBoxProps {
  row: CollectionSourceRow;
  selected?: boolean;
  onSelect?: () => void;
}

const SourceBox: React.FC<SourceBoxProps> = ({ row, selected = false, onSelect }) => {
  const collectionId = row.collection.id;

  return (
    <div
      className={`border rounded-lg p-3 shadow-xs bg-card text-card-foreground flex items-center justify-between gap-4 ${selected ? 'border-primary ring-1 ring-primary' : 'hover:border-primary cursor-pointer'}`}
      onClick={onSelect}
      role={onSelect ? 'button' : undefined}
      aria-pressed={onSelect ? (selected ? 'true' : 'false') : undefined}
    >
      <div className="flex min-w-0 flex-col">
        <span className="font-medium">{row.collection.title}</span>
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          by <UserDisplay user={row.user} />
        </span>
      </div>
      <Link
        to={`/collections/$collectionId`}
        params={{ collectionId }}
        onClick={e => e.stopPropagation()}
      >
        <Button size="sm" variant="secondary">
          Open
        </Button>
      </Link>
    </div>
  );
};

export default SourceBox;
