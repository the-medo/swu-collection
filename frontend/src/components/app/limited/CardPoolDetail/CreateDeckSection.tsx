import { limitedStyles } from '@/components/app/limited/limitedStyles';
import React from 'react';
import type { CardPool } from '../../../../../../server/db/schema/card_pool.ts';
import { Input } from '@/components/ui/input.tsx';
import { Button } from '@/components/ui/button.tsx';
import VisibilitySelector from '@/components/app/global/VisibilitySelector/VisibilitySelector.tsx';
import { Visibility } from '../../../../../../shared/types/visibility.ts';
import { useCreateCardPoolDeck } from '@/api/card-pools/useCreateCardPoolDeck.ts';
import { cn } from '@/lib/utils.ts';
import { useNavigate } from '@tanstack/react-router';
import { useCardPoolDeckDetailStoreActions } from '@/components/app/limited/CardPoolDeckDetail/useCardPoolDeckDetailStore.ts';
import { ArrowRight, LoaderCircle } from 'lucide-react';
import { DeckIcon } from '@/components/app/global/icons/CardLibraryIcons.tsx';
import SignInWrapper from '@/components/app/auth/SignInWrapper.tsx';

export interface CreateDeckSectionProps {
  pool?: CardPool;
  className?: string;
  onCreated?: () => void;
  initialVisibility?: Visibility;
}

const CreateDeckSection: React.FC<CreateDeckSectionProps> = ({
  pool,
  className,
  onCreated,
  initialVisibility,
}) => {
  const navigate = useNavigate();
  const { resetAll } = useCardPoolDeckDetailStoreActions();
  const [name, setName] = React.useState<string>('');
  const [visibility, setVisibility] = React.useState<Visibility>(
    initialVisibility ?? (pool?.visibility as Visibility | null) ?? Visibility.Unlisted,
  );

  const defaultName = React.useMemo(() => {
    return pool?.name ? `Deck from ${pool.name}` : '';
  }, [pool?.name]);

  React.useEffect(() => {
    setName(defaultName);
  }, [defaultName]);

  const createMutation = useCreateCardPoolDeck(pool?.id);

  const poolIsReady = Boolean(pool?.id) && pool?.status !== 'in_progress';
  const canSubmit = poolIsReady && name.trim().length > 0 && !createMutation.isPending;

  const handleCreate = () => {
    if (!canSubmit) return;
    createMutation.mutate(
      { name: name.trim(), visibility },
      {
        onSuccess: data => {
          // Reset name to default to allow quick subsequent creations
          setName(defaultName);
          onCreated?.();
          resetAll();
          navigate({ to: `/limited/deck/$deckId`, params: { deckId: data?.data.deck.id } });
        },
      },
    );
  };

  return (
    <section
      aria-labelledby="create-pool-deck-heading"
      className={cn(limitedStyles.deckCreate, className)}
    >
      <div className="mb-4 flex items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-[var(--limited-border)] bg-card text-[var(--limited-accent)]">
          <DeckIcon size={23} />
        </span>
        <div>
          <h2 id="create-pool-deck-heading" className={limitedStyles.heading}>
            Create a deck
          </h2>
          <p className="m-0! text-xs text-muted-foreground">Build with the cards in this pool.</p>
        </div>
      </div>
      <div className="flex flex-col gap-3">
        <div className="space-y-1.5">
          <label htmlFor="pool-new-deck-name" className="text-xs font-medium">
            Deck name
          </label>
          <Input
            id="pool-new-deck-name"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Deck name"
            className="h-9 w-full text-sm"
            disabled={!poolIsReady || createMutation.isPending}
          />
        </div>
        <fieldset className="min-w-0" disabled={createMutation.isPending}>
          <legend className="mb-1.5 text-xs font-medium">Visibility</legend>
          <VisibilitySelector
            className={limitedStyles.segments}
            value={visibility}
            onChange={value => {
              if (value) setVisibility(value);
            }}
          />
        </fieldset>
        <div className="flex [&>button]:w-full [&>button]:bg-[var(--limited-accent)] [&>button]:text-[var(--limited-contrast)]">
          <SignInWrapper text="Sign in to start a deck">
            <Button
              type="button"
              onClick={handleCreate}
              disabled={!canSubmit}
              className={cn('h-10 w-full justify-between px-3', limitedStyles.primary)}
            >
              {createMutation.isPending ? 'Creating…' : 'Create deck'}
              {createMutation.isPending ? (
                <LoaderCircle
                  className="size-4 animate-spin motion-reduce:animate-none"
                  aria-hidden="true"
                />
              ) : (
                <ArrowRight size={16} aria-hidden="true" />
              )}
            </Button>
          </SignInWrapper>
        </div>
        {pool?.status === 'in_progress' && (
          <p className="m-0! text-xs text-muted-foreground">
            Complete the pool’s card list before creating a deck.
          </p>
        )}
        {createMutation.isError && (
          <div role="alert" className="text-xs text-destructive">
            {createMutation.error.message}
          </div>
        )}
        {createMutation.isSuccess && (
          <div role="status" className="text-xs text-[var(--limited-accent)]">
            Deck created!
          </div>
        )}
      </div>
    </section>
  );
};

export default CreateDeckSection;
