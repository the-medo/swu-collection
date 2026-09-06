import React, { useState } from 'react';
import GridSection from '@/components/app/global/GridSection/GridSection.tsx';
import GridSectionContent from '@/components/app/global/GridSection/GridSectionContent.tsx';
import SectionHeader from '@/components/app/daily-snapshots/sections/components/SectionHeader.tsx';
import {
  CARD_POOL_BOOSTER_COUNTS,
  CardPoolType,
  DEFAULT_CARD_POOL_BOOSTER_COUNT,
  type CardPoolBoosterCount,
} from '../../../../../../shared/types/cardPools.ts';
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
import SignInWrapper from '@/components/app/auth/SignInWrapper.tsx';
import { useNavigate } from '@tanstack/react-router';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group.tsx';
import CustomPoolCardEntry from './CustomPoolCardEntry.tsx';
import type { CustomPoolDraftEntry } from './customPoolDraft.ts';

type PoolCreationMode = 'generated' | 'custom';

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

const generatePoolName = (
  type: CardPoolType,
  setAbbr: SwuSet,
  custom: boolean,
  date: Date = new Date(),
) => {
  const label = custom ? 'Custom' : typeLabel(type);
  return `${label} ${setAbbr.toUpperCase()} [${formatDate(date)}]`;
};

const CreatePool: React.FC = () => {
  const navigate = useNavigate();
  const [creationMode, setCreationMode] = useState<PoolCreationMode>('generated');
  const [selectedType, setSelectedType] = useState<CardPoolType>(CardPoolType.Sealed);
  const [selectedSet, setSelectedSet] = useState<SwuSet>(SwuSet.ASH);
  const [boosterCount, setBoosterCount] = useState<CardPoolBoosterCount>(
    DEFAULT_CARD_POOL_BOOSTER_COUNT,
  );
  const [customCards, setCustomCards] = useState<CustomPoolDraftEntry[]>([]);
  const [visibility, setVisibility] = useState<Visibility>(Visibility.Public);
  const [userEditedName, setUserEditedName] = useState<boolean>(false);
  const [name, setName] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [expanded, setExpanded] = useState<boolean>(false);

  const { toast } = useToast();
  const createPoolMutation = useCreateCardPool();

  const poolName = userEditedName
    ? name
    : generatePoolName(
        creationMode === 'custom' ? CardPoolType.Sealed : selectedType,
        selectedSet,
        creationMode === 'custom',
      );

  const handleCreationModeChange = (value: string) => {
    if (value !== 'generated' && value !== 'custom') return;
    setCreationMode(value);
  };

  const handleTypeChange = (type: CardPoolType) => {
    setSelectedType(type);
    if (type === CardPoolType.Prerelease) {
      setBoosterCount(DEFAULT_CARD_POOL_BOOSTER_COUNT);
    }
  };

  const handleSetChange = (set: SwuSet) => {
    if (set === selectedSet) return;

    if (customCards.length > 0 && set !== selectedSet) {
      if (creationMode === 'custom') {
        toast({
          title: 'Clear the custom pool before changing sets',
          description: 'Collector numbers are resolved within the currently selected set.',
        });
        return;
      }

      setCustomCards([]);
      toast({
        title: 'Custom pool draft cleared',
        description: 'Its card numbers belonged to the previously selected set.',
      });
    }
    setSelectedSet(set);
  };

  const handleCreate = () => {
    const custom = creationMode === 'custom';
    const cards = customCards.map(card => card.cardId);

    createPoolMutation.mutate(
      {
        set: selectedSet,
        type: custom ? CardPoolType.Sealed : selectedType,
        visibility,
        name: poolName,
        description,
        custom,
        ...(custom ? { cards } : { boosterCount }),
      },
      {
        onSuccess: data => {
          toast({ title: `Card pool "${poolName}" created!` });
          navigate({ to: `/limited/pool/$poolId/detail`, params: { poolId: data.data.id } });
        },
        onError: error => {
          toast({
            title: 'Failed to create card pool',
            description: error.message,
            variant: 'destructive',
          });
        },
      },
    );
  };

  const canCreate =
    poolName.trim().length > 0 &&
    !createPoolMutation.isPending &&
    (creationMode === 'generated' || customCards.length > 0);

  return (
    <GridSection id="create-pool-section" sizing={gridSizing}>
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
              onChange={handleSetChange}
              forcedSetList={cardPoolSets}
            />
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium">Creation method</span>
            <ToggleGroup
              type="single"
              value={creationMode}
              onValueChange={handleCreationModeChange}
              className="justify-start"
              aria-label="Card pool creation method"
            >
              <ToggleGroupItem value="generated">Generate packs</ToggleGroupItem>
              <ToggleGroupItem value="custom">Enter my cards</ToggleGroupItem>
            </ToggleGroup>
          </div>

          {creationMode === 'generated' ? (
            <>
              <CardPoolTypeSelector
                selectedType={selectedType}
                setSelectedType={handleTypeChange}
                sealedBoosterCount={boosterCount}
                showPrerelease={expanded}
              />

              {selectedType === CardPoolType.Sealed && (
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-medium">Booster packs</span>
                  <ToggleGroup
                    type="single"
                    value={String(boosterCount)}
                    onValueChange={value => {
                      const count = CARD_POOL_BOOSTER_COUNTS.find(
                        candidate => String(candidate) === value,
                      );
                      if (count !== undefined) {
                        setBoosterCount(count);
                      }
                    }}
                    className="justify-start"
                    aria-label="Number of booster packs"
                  >
                    {CARD_POOL_BOOSTER_COUNTS.map(count => (
                      <ToggleGroupItem key={count} value={String(count)}>
                        {count} packs
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                </div>
              )}
            </>
          ) : (
            <CustomPoolCardEntry
              selectedSet={selectedSet}
              entries={customCards}
              onChange={setCustomCards}
              disabled={createPoolMutation.isPending}
              description={
                <>
                  Enter a {selectedSet.toUpperCase()} collector number and press Enter. You can
                  create custom pool now and update it afterwards.
                </>
              }
            />
          )}

          {expanded && (
            <div className="flex flex-col gap-2 mt-2">
              <Input
                type="text"
                placeholder="Name"
                value={poolName}
                maxLength={200}
                onChange={e => {
                  if (!userEditedName) setUserEditedName(true);
                  setName(e.target.value);
                }}
              />
              <Textarea
                placeholder="Description"
                value={description}
                maxLength={2000}
                onChange={e => setDescription(e.target.value)}
              />
            </div>
          )}

          <div className="flex justify-between gap-2 mt-2 flex-wrap">
            <VisibilitySelector value={visibility} onChange={setVisibility} />
            <SignInWrapper
              text={creationMode === 'custom' ? 'Sign in to create' : 'Sign in to generate'}
            >
              <Button onClick={handleCreate} disabled={!canCreate}>
                {createPoolMutation.isPending
                  ? 'Creating...'
                  : creationMode === 'custom'
                    ? 'Create custom pool'
                    : 'Generate'}
              </Button>
            </SignInWrapper>
          </div>

          <div className="-mt-2">
            {!expanded && (
              <button
                type="button"
                className="text-xs text-muted-foreground hover:text-foreground underline"
                onClick={() => setExpanded(true)}
              >
                Show more options
              </button>
            )}
          </div>
        </div>
      </GridSectionContent>
    </GridSection>
  );
};

export default CreatePool;
