import React, { useState, useEffect, useCallback } from 'react';
import GridSection from '@/components/app/global/GridSection/GridSection.tsx';
import GridSectionContent from '@/components/app/global/GridSection/GridSectionContent.tsx';
import SectionHeader from '@/components/app/daily-snapshots/sections/components/SectionHeader.tsx';
import { CardPoolType } from '../../../../../../shared/types/cardPools.ts';
import CardPoolTypeSelector from '@/components/app/limited/CreatePool/CardPoolTypeSelector.tsx';
import { SwuSet } from '../../../../../../types/enums.ts';
import SetIcon from '@/components/app/global/icons/SetIcon.tsx';
import SetSelect from '@/components/app/global/SetSelect.tsx';
import { cardPoolSets } from '../../../../../../lib/swu-resources/card-pool-info.ts';
import VisibilitySelector from '@/components/app/global/VisibilitySelector/VisibilitySelector.tsx';
import { Visibility } from '../../../../../../shared/types/visibility.ts';
import { Input } from '@/components/ui/input.tsx';
import { Textarea } from '@/components/ui/textarea.tsx';
import { Button } from '@/components/ui/button.tsx';
import { useToast } from '@/hooks/use-toast.ts';
import { useCreateCardPool } from '@/api/card-pools/useCreateCardPool.ts';

const gridSizing = {
  4: { row: { from: 1, to: 3 }, col: { from: 1, to: 1 } },
  3: { row: { from: 1, to: 3 }, col: { from: 1, to: 1 } },
  2: { row: { from: 1, to: 3 }, col: { from: 1, to: 1 } },
  1: { row: { from: 2, to: 2 }, col: { from: 1, to: 1 } },
};

const formatDate = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const typeLabel = (type: CardPoolType): string => {
  switch (type) {
    case CardPoolType.Sealed:
      return 'Sealed';
    case CardPoolType.Draft:
      return 'Draft';
    case CardPoolType.Prerelease:
      return 'Prerelease';
    default:
      return String(type);
  }
};

const generatePoolName = (type: CardPoolType, setAbbr: SwuSet, date: Date = new Date()) => {
  return `${typeLabel(type)} ${setAbbr.toUpperCase()} [${formatDate(date)}]`;
};

const CreatePool: React.FC = () => {
  const [selectedType, setSelectedType] = useState<CardPoolType>(CardPoolType.Sealed);
  const [selectedSet, setSelectedSet] = useState<SwuSet>(SwuSet.SEC);
  const [visibility, setVisibility] = useState<Visibility>(Visibility.Public);
  const [userEditedName, setUserEditedName] = useState<boolean>(false);
  const [name, setName] = useState<string>(generatePoolName(selectedType, selectedSet, new Date()));
  const [description, setDescription] = useState<string>('');

  const { toast } = useToast();
  const createPoolMutation = useCreateCardPool();

  // Auto-update the generated name when type or set changes, unless user already edited the name.
  useEffect(() => {
    if (!userEditedName) {
      setName(generatePoolName(selectedType, selectedSet, new Date()));
    }
  }, [selectedType, selectedSet, userEditedName]);

  const handleCreate = useCallback(
    (custom: boolean) => {
      createPoolMutation.mutate(
        {
          set: selectedSet,
          type: selectedType,
          visibility,
          name,
          description,
          custom,
        },
        {
          onSuccess: () => {
            toast({ title: `Card pool "${name}" created!` });
            // Could navigate to the newly created pool if route exists in the app
            // e.g., navigate({ to: `/limited/pools/${result.data.id}` })
          },
          onError: () => {
            toast({ title: 'Failed to create card pool', variant: 'destructive' });
          },
        },
      );
    },
    [selectedSet, selectedType, visibility, name, description],
  );

  const handleCreateCustom = useCallback(() => {
    handleCreate(true);
  }, [handleCreate]);

  const handleCreateAutomatic = useCallback(() => {
    handleCreate(false);
  }, [handleCreate]);

  return (
    <GridSection sizing={gridSizing}>
      <GridSectionContent>
        <SectionHeader
          headerAndTooltips={
            <>
              <div className="flex items-center gap-2 flex-wrap">
                <h4>Create new card pool</h4>
              </div>
            </>
          }
        />
        <div className="flex flex-col gap-2">
          <div className={'bg-black rounded-lg p-2'}>
            <SetIcon set={selectedSet} size="full" />
            <SetSelect
              value={selectedSet}
              emptyOption={false}
              showFullName={true}
              onChange={setSelectedSet}
              forcedSetList={cardPoolSets}
            />
          </div>
          <CardPoolTypeSelector selectedType={selectedType} setSelectedType={setSelectedType} />

          <div className="flex flex-col gap-2 mt-2">
            <Input
              type="text"
              placeholder="Name"
              value={name}
              onChange={e => {
                if (!userEditedName) setUserEditedName(true);
                setName(e.target.value);
              }}
            />
            <Textarea
              placeholder="Description"
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>
          <VisibilitySelector value={visibility} onChange={setVisibility} />

          <div className="flex justify-end gap-2 mt-2">
            <Button
              variant="outline"
              onClick={handleCreateCustom}
              disabled={createPoolMutation.isPending || name.trim().length === 0}
            >
              {createPoolMutation.isPending ? 'Creating...' : 'Import your own'}
            </Button>
            <Button
              onClick={handleCreateAutomatic}
              disabled={createPoolMutation.isPending || name.trim().length === 0}
            >
              {createPoolMutation.isPending ? 'Creating...' : 'Generate'}
            </Button>
          </div>
        </div>
      </GridSectionContent>
    </GridSection>
  );
};

export default CreatePool;
