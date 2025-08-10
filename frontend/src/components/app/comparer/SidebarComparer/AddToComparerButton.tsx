import * as React from 'react';
import { Button, ButtonProps } from '@/components/ui/button';
import { Scale } from 'lucide-react';
import {
  ComparerEntryAdditionalData,
  useComparerStore,
  useComparerStoreActions,
} from '@/components/app/comparer/useComparerStore';
import { cn } from '@/lib/utils';
import { CollectionType } from '../../../../../../types/enums.ts';

interface AddToComparerButtonProps extends Omit<ButtonProps, 'onClick'> {
  id: string;
  dataType: 'collection' | 'deck';
  collectionType?: CollectionType;
  additionalData?: ComparerEntryAdditionalData;
  className?: string;
}

const AddToComparerButton: React.FC<AddToComparerButtonProps> = ({
  id,
  dataType,
  collectionType,
  additionalData,
  className,
  children,
  ...props
}) => {
  const { entries } = useComparerStore();
  const { addComparerEntry, removeComparerEntry } = useComparerStoreActions();

  const isInComparer = entries.some(entry => entry.id === id);

  const handleClick = () => {
    if (isInComparer) {
      removeComparerEntry(id);
    } else {
      addComparerEntry({ id, dataType, additionalData, collectionType });
    }
  };

  return (
    <Button variant="outline" className={cn('gap-2', className)} onClick={handleClick} {...props}>
      <Scale className="h-4 w-4" />
      {children || (isInComparer ? 'Remove from comparer' : 'Add to comparer')}
    </Button>
  );
};

export default AddToComparerButton;
