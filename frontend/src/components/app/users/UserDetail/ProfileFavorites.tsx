import {
  forwardRef,
  useId,
  useState,
  type ComponentProps,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from 'react';
import { Pencil, Plus, Star } from 'lucide-react';
import { useCardList } from '@/api/lists/useCardList.ts';
import { useUserProfile } from '@/api/user-profile/useUserProfile.ts';
import { useUpdateUserProfile } from '@/api/user-profile/useUpdateUserProfile.ts';
import { useToast } from '@/hooks/use-toast.ts';
import LeaderSelector from '@/components/app/global/LeaderSelector/LeaderSelector.tsx';
import CardSearchCommand from '@/components/app/global/CardSearchCommand/CardSearchCommand.tsx';
import { useCardSearchCommandStoreActions } from '@/components/app/global/CardSearchCommand/useCardSearchCommandStore.tsx';
import CardImage from '@/components/app/global/CardImage.tsx';
import CardArtCrop from '@/components/app/global/CardArtCrop.tsx';
import DeckCardHoverImage from '@/components/app/decks/DeckContents/DeckCards/DeckLayout/DeckCardHoverImage.tsx';
import AspectIcon from '@/components/app/global/icons/AspectIcon.tsx';
import Dialog from '@/components/app/global/Dialog.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Skeleton } from '@/components/ui/skeleton.tsx';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group.tsx';
import { useSidebar } from '@/components/ui/sidebar.tsx';
import { cn } from '@/lib/utils.ts';
import { SwuAspect } from '../../../../../../types/enums.ts';
import type { UserProfileFavoritesInput } from '../../../../../../types/UserProfile.ts';
import { selectDefaultVariant } from '../../../../../../server/lib/cards/selectDefaultVariant.ts';

const favoritesClassName = 'grid w-full min-w-0 grid-cols-2 items-start gap-3';

const aspectsContainerClassName = 'col-span-2';

type FavoriteTileProps = ComponentPropsWithoutRef<'button'> & {
  description: string;
  empty: boolean;
  editable: boolean;
  containerClassName?: string;
  previewCard?: ComponentProps<typeof DeckCardHoverImage>['card'];
};

const FavoriteTile = forwardRef<HTMLButtonElement, FavoriteTileProps>(
  (
    {
      description,
      empty,
      editable,
      children,
      className,
      containerClassName,
      previewCard,
      disabled,
      onClick,
      onFocus,
      ...props
    },
    ref,
  ) => {
    const { isMobile } = useSidebar();
    const editorOpen = props['aria-expanded'] === true || props['aria-expanded'] === 'true';
    const tileClassName = cn(
      'group relative flex aspect-[199/172] w-full min-w-0 items-center justify-center overflow-hidden rounded-md border border-border bg-muted/30',
      empty &&
        'border-dashed border-muted-foreground/40 bg-[repeating-linear-gradient(135deg,transparent,transparent_6px,hsl(var(--muted)/0.45)_6px,hsl(var(--muted)/0.45)_7px)]',
      editable &&
        'transition-colors hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring aria-disabled:opacity-50',
      className,
    );
    const content = empty ? (
      editable ? (
        <Plus className="size-5 text-muted-foreground" aria-hidden="true" />
      ) : (
        <span className="text-muted-foreground">—</span>
      )
    ) : (
      <>
        {children}
        {editable && (
          <span className="absolute inset-0 flex items-center justify-center bg-black/50 text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
            <Pencil className="size-4" aria-hidden="true" />
          </span>
        )}
      </>
    );
    return (
      <div className={cn('min-w-0', containerClassName)}>
        <DeckCardHoverImage card={previewCard} active={!!previewCard} previewDisabled={editorOpen}>
          {editable ? (
            <button
              ref={ref}
              type="button"
              className={tileClassName}
              aria-label={description}
              title={description}
              aria-disabled={disabled || undefined}
              onClick={event => {
                if (disabled) event.preventDefault();
                else onClick?.(event);
              }}
              onFocus={event => {
                onFocus?.(event);
                // Mouse-driven dialog focus restoration should not reopen a preview.
                if (!event.currentTarget.matches(':focus-visible')) event.preventDefault();
              }}
              {...props}
            >
              {content}
            </button>
          ) : (
            <div
              className={tileClassName}
              role="img"
              aria-label={description}
              title={description}
              tabIndex={previewCard && !isMobile ? 0 : undefined}
              onFocus={event => {
                if (!event.currentTarget.matches(':focus-visible')) event.preventDefault();
              }}
            >
              {content}
            </div>
          )}
        </DeckCardHoverImage>
      </div>
    );
  },
);
FavoriteTile.displayName = 'FavoriteTile';

type FavoriteDialogProps = {
  trigger: ReactNode;
  pending: boolean;
  save: (input: UserProfileFavoritesInput) => Promise<boolean>;
};

function FavoriteCardDialog({
  cardId,
  trigger,
  pending,
  save,
}: FavoriteDialogProps & { cardId: string | null }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(cardId);
  const commandId = useId();
  const searchActions = useCardSearchCommandStoreActions(commandId);
  const { data: cards } = useCardList();
  const card = cards?.cards[selected ?? ''];
  return (
    <Dialog
      trigger={trigger}
      open={open}
      onOpenChange={next => {
        if (pending) return;
        if (next) setSelected(cardId);
        searchActions.setOpen(false);
        searchActions.setSearch('');
        setOpen(next);
      }}
      header="Favorite card"
      headerDescription="Search for a card to feature on your profile."
      contentClassName="w-[calc(100vw-2rem)]"
      footer={
        <div className="flex w-full justify-between gap-2">
          <Button variant="ghost" disabled={pending || !selected} onClick={() => setSelected(null)}>
            Clear
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" disabled={pending} onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={pending}
              onClick={async () => {
                if (await save({ favoriteCardId: selected })) setOpen(false);
              }}
            >
              {pending ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        <CardSearchCommand
          id={commandId}
          label="Search favorite card"
          disabled={pending}
          onSelectCard={id => setSelected(id)}
        />
        <div className="flex min-h-40 items-center justify-center gap-4 p-2" aria-live="polite">
          {card ? (
            <>
              <CardImage
                card={card}
                cardVariantId={selectDefaultVariant(card)}
                size="w100"
                backSideButton={false}
              />
              <span className="min-w-0 text-sm font-medium">{card.name}</span>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              {selected ? 'Saved card is currently unavailable.' : 'No favorite card selected.'}
            </p>
          )}
        </div>
      </div>
    </Dialog>
  );
}

function FavoriteAspectsDialog({
  aspects,
  trigger,
  pending,
  save,
}: FavoriteDialogProps & { aspects: SwuAspect[] }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<(SwuAspect | '')[]>([]);
  return (
    <Dialog
      trigger={trigger}
      open={open}
      onOpenChange={next => {
        if (pending) return;
        if (next) setSelected([0, 1, 2].map(i => aspects[i] ?? ''));
        setOpen(next);
      }}
      header="Favorite aspects"
      headerDescription="Choose up to three aspects. Repeats are welcome; select an active aspect again to clear it."
      contentClassName="w-[calc(100vw-2rem)]"
      footer={
        <div className="flex w-full justify-between gap-2">
          <Button variant="ghost" disabled={pending} onClick={() => setSelected(['', '', ''])}>
            Clear
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" disabled={pending} onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={pending}
              onClick={async () => {
                const favoriteAspects = selected.filter((a): a is SwuAspect => a !== '');
                if (await save({ favoriteAspects })) setOpen(false);
              }}
            >
              {pending ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4 py-2">
        {[0, 1, 2].map(index => (
          <fieldset key={index} className="min-w-0 space-y-2">
            <legend className="text-sm font-medium">Aspect {index + 1}</legend>
            <ToggleGroup
              type="single"
              variant="outline"
              value={selected[index] ?? ''}
              disabled={pending}
              aria-label={`Aspect ${index + 1}`}
              className="grid grid-cols-6 gap-1"
              onValueChange={value =>
                setSelected(current =>
                  current.map((a, i) => (i === index ? (value as SwuAspect | '') : a)),
                )
              }
            >
              {Object.values(SwuAspect).map(aspect => (
                <ToggleGroupItem
                  key={aspect}
                  value={aspect}
                  aria-label={aspect}
                  title={aspect}
                  className="min-w-0 px-1 data-[state=on]:border-primary data-[state=on]:bg-primary/15"
                >
                  <AspectIcon aspect={aspect} size="medium" />
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </fieldset>
        ))}
      </div>
    </Dialog>
  );
}

export function ProfileFavoritesSkeleton() {
  return (
    <div className="w-full min-w-0" aria-label="Loading favorites">
      <Skeleton className="mb-2 h-4 w-20" />
      <div className={favoritesClassName}>
        {[0, 1].map(index => (
          <Skeleton key={index} className="aspect-[199/172] w-full" />
        ))}
        <Skeleton className={cn('h-16 w-full', aspectsContainerClassName)} />
      </div>
    </div>
  );
}

export function ProfileFavorites({ userId, canEdit }: { userId: string; canEdit: boolean }) {
  const profile = useUserProfile(userId);
  const mutation = useUpdateUserProfile(userId);
  const { data: cards } = useCardList();
  const { toast } = useToast();
  const save = async (input: UserProfileFavoritesInput) => {
    try {
      await mutation.mutateAsync(input);
      return true;
    } catch (error) {
      toast({
        title: 'Could not save favorites',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
      return false;
    }
  };
  if (profile.isPending) return <ProfileFavoritesSkeleton />;
  if (profile.isError)
    return (
      <div role="alert" className="text-sm text-muted-foreground">
        Could not load favorites.{' '}
        <Button variant="ghost" onClick={() => void profile.refetch()}>
          Try again
        </Button>
      </div>
    );
  const { favoriteLeaderCardId, favoriteCardId, favoriteAspects } = profile.data;
  const showLeader = canEdit || !!favoriteLeaderCardId;
  const showCard = canEdit || !!favoriteCardId;
  const showAspects = canEdit || favoriteAspects.length > 0;
  if (!showLeader && !showCard && !showAspects) return null;
  const cardTile = (label: string, id: string | null) => {
    const card = cards?.cards[id ?? ''];
    return (
      <FavoriteTile
        previewCard={card}
        description={`${canEdit ? 'Edit favorite' : 'Favorite'} ${label.toLowerCase()}: ${card?.name ?? (id ? 'Unavailable card' : 'Not set')}`}
        empty={!id}
        editable={canEdit}
        disabled={mutation.isPending || !cards}
        className={card?.type === 'Base' ? 'aspect-[90/49]' : undefined}
      >
        {card ? (
          <CardArtCrop card={card} />
        ) : (
          <span className="px-1 text-xs text-muted-foreground">
            {cards ? 'Unavailable' : 'Loading…'}
          </span>
        )}
      </FavoriteTile>
    );
  };
  const aspectTile = (
    <FavoriteTile
      description={`${canEdit ? 'Edit favorite' : 'Favorite'} aspects: ${favoriteAspects.join(', ') || 'Not set'}`}
      empty={favoriteAspects.length === 0}
      editable={canEdit}
      disabled={mutation.isPending}
      className="aspect-auto h-16"
      containerClassName={aspectsContainerClassName}
    >
      <div className="flex min-w-0 flex-wrap justify-center gap-2 p-3">
        {favoriteAspects.map((aspect, i) => (
          <AspectIcon key={i} aspect={aspect} size="original" />
        ))}
      </div>
    </FavoriteTile>
  );
  return (
    <div
      className="w-full min-w-0"
      role="group"
      aria-label="Player favorites"
      aria-busy={mutation.isPending}
    >
      <div
        role="heading"
        aria-level={2}
        className="mb-2 flex items-center gap-1.5 text-xs text-muted-foreground"
      >
        <Star className="size-3.5" aria-hidden="true" /> Favorites
      </div>
      <div className={favoritesClassName}>
        {showLeader && (
          <LeaderSelector
            key={userId}
            leaderCardId={favoriteLeaderCardId ?? undefined}
            trigger={cardTile('Leader', favoriteLeaderCardId)}
            editable={canEdit}
            onLeaderSelected={id => void save({ favoriteLeaderCardId: id ?? null })}
          />
        )}
        {showCard &&
          (canEdit ? (
            <FavoriteCardDialog
              cardId={favoriteCardId}
              trigger={cardTile('Card', favoriteCardId)}
              pending={mutation.isPending}
              save={save}
            />
          ) : (
            cardTile('Card', favoriteCardId)
          ))}
        {showAspects &&
          (canEdit ? (
            <FavoriteAspectsDialog
              aspects={favoriteAspects}
              trigger={aspectTile}
              pending={mutation.isPending}
              save={save}
            />
          ) : (
            aspectTile
          ))}
      </div>
    </div>
  );
}
