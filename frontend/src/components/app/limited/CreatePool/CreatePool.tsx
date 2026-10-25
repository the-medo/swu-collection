import { limitedStyles } from '@/components/app/limited/limitedStyles';
import { cn } from '@/lib/utils';
import React, { useState } from 'react';
import { ChevronDown, ChevronUp, ArrowRight } from 'lucide-react';
import { Label } from '@/components/ui/label.tsx';
import {
  CARD_POOL_BOOSTER_COUNTS,
  CardPoolType,
  DEFAULT_CARD_POOL_BOOSTER_COUNT,
  type CardPoolBoosterCount,
} from '../../../../../../shared/types/cardPools.ts';
import CardPoolTypeSelector from '@/components/app/limited/CreatePool/CardPoolTypeSelector.tsx';
import { SwuSet } from '../../../../../../types/enums.ts';
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

import PoolSetArtwork from './PoolSetArtwork.tsx';
import { SealedDeckIcon } from '@/components/app/global/icons/CardLibraryIcons.tsx';

type PoolCreationMode = 'generated' | 'custom';

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
  const [selectedSet, setSelectedSet] = useState<SwuSet>(SwuSet.HMW);
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
    <section
      id="create-pool-section"
      aria-labelledby="create-pool-heading"
      className={cn('limited-create-pool overflow-hidden', limitedStyles.panel)}
    >
      <div className={limitedStyles.createCover}>
        <PoolSetArtwork set={selectedSet} />
        <div className="relative z-10 p-4">
          <SealedDeckIcon size={24} className="mb-2" />
          <h2 id="create-pool-heading" className={cn('text-white', limitedStyles.heading)}>
            Create card pool
          </h2>
          <p className="m-0! mt-1! max-w-48 text-xs text-white/80">
            Open some packs. See what you can build.
          </p>
        </div>
      </div>
      <div className="flex flex-col gap-3 p-4">
        <div className="space-y-1">
          <span className="text-xs font-medium text-muted-foreground">Set</span>
          <SetSelect
            value={selectedSet}
            emptyOption={false}
            showFullName={true}
            onChange={handleSetChange}
            forcedSetList={cardPoolSets}
          />
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground">Creation method</span>
          <ToggleGroup
            type="single"
            value={creationMode}
            onValueChange={handleCreationModeChange}
            className={limitedStyles.segments}
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
              showPrerelease={expanded || selectedType === CardPoolType.Prerelease}
            />

            {selectedType === CardPoolType.Sealed && (
              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium text-muted-foreground">Booster packs</span>
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
                  className={limitedStyles.segments}
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
                Enter a {selectedSet.toUpperCase()} collector number and press Enter. You can create
                the pool now and add more cards later.
              </>
            }
          />
        )}

        {expanded && (
          <div id="pool-extra-options" className="flex flex-col gap-2">
            <Label htmlFor="pool-name">Name</Label>
            <Input
              type="text"
              id="pool-name"
              placeholder="Pool name"
              value={poolName}
              maxLength={200}
              onChange={e => {
                if (!userEditedName) setUserEditedName(true);
                setName(e.target.value);
              }}
            />
            <Label htmlFor="pool-description">Description</Label>
            <Textarea
              id="pool-description"
              placeholder="Description"
              value={description}
              maxLength={2000}
              onChange={e => setDescription(e.target.value)}
            />
          </div>
        )}

        <fieldset className="min-w-0">
          <legend className="mb-1 text-xs font-medium text-muted-foreground">Visibility</legend>
          <VisibilitySelector
            className={limitedStyles.segments}
            value={visibility}
            onChange={value => {
              if (value) setVisibility(value);
            }}
          />
        </fieldset>
        <div className="flex [&>button]:w-full [&>button]:bg-[var(--limited-accent)] [&>button]:text-[var(--limited-contrast)]">
          <SignInWrapper
            text={creationMode === 'custom' ? 'Sign in to create' : 'Sign in to generate'}
          >
            <Button
              className={cn('w-full justify-between', limitedStyles.primary)}
              onClick={handleCreate}
              disabled={!canCreate}
            >
              {createPoolMutation.isPending
                ? 'Creating...'
                : creationMode === 'custom'
                  ? 'Create custom pool'
                  : `Generate ${boosterCount} packs`}
              <ArrowRight size={16} aria-hidden="true" />
            </Button>
          </SignInWrapper>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 justify-start self-start px-0 text-xs text-muted-foreground"
          aria-expanded={expanded}
          aria-controls="pool-extra-options"
          onClick={() => setExpanded(value => !value)}
        >
          {expanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
          {expanded ? 'Fewer options' : 'Name, description & prerelease'}
        </Button>
      </div>
    </section>
  );
};

export default CreatePool;
