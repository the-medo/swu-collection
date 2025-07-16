import React from 'react';
import { useCCDetail } from '@/components/app/collections/CollectionContents/CollectionGroups/useCollectionGroupStore.ts';
import { getIdentificationFromCollectionCard } from '@/components/app/collections/CollectionCardTable/collectionTableLib.tsx';
import { getCollectionCardIdentificationKey } from '@/api/collections/usePutCollectionCard.ts';
import CollectionCardInput, { CollectionCardInputProps } from '@/components/app/collections/CollectionContents/components/CollectionCardInput.tsx';
import { NotebookPen } from 'lucide-react';

interface NoteCellProps {
  cardKey: string;
  collectionId: string;
  owned: boolean;
  onChange: CollectionCardInputProps['onChange'];
}

const NoteCell: React.FC<NoteCellProps> = ({ cardKey, collectionId, owned, onChange }) => {
  const collectionCard = useCCDetail(cardKey);
  const note = collectionCard.note;

  if (owned) {
    const id = getIdentificationFromCollectionCard(collectionCard);
    return (
      <CollectionCardInput
        inputId={getCollectionCardIdentificationKey(id)}
        id={id}
        field="note"
        value={note}
        onChange={onChange}
      />
    );
  }

  if (note === '') return <div className="w-20 min-w-20"></div>;

  return (
    <div className="text-sm text-gray-500 relative group w-20 min-w-20 max-w-20 flex gap-1 items-center">
      <NotebookPen className="max-w-3 min-w-3 max-h-3 min-h-3" />
      <span
        className="text-left truncate max-w-full text-ellipsis overflow-hidden whitespace-nowrap"
        title={note}
      >
        {note}
      </span>
      <span className="invisible absolute bottom-6 left-0 z-10 w-max bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover:visible group-hover:opacity-100">
        {note}
      </span>
    </div>
  );
};

export default NoteCell;
