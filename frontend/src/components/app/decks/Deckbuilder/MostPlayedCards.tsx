import { useMemo } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { AlertCircle, Loader2, TrendingUp } from 'lucide-react';
import { useGetDeck } from '@/api/decks/useGetDeck.ts';
import { useGetMetas } from '@/api/meta';
import { useCardStats } from '@/api/card-stats';
import { useCardList } from '@/api/lists/useCardList.ts';
import { Button } from '@/components/ui/button.tsx';
import { ScrollArea } from '@/components/ui/scroll-area.tsx';
import AspectIcon from '@/components/app/global/icons/AspectIcon.tsx';
import { getCardDetailDialogSearch } from '@/components/app/cards/CardDetail/cardDetailSearchParams.ts';
import { useAdvancedCardSearchStore } from '@/components/app/cards/AdvancedCardSearch/useAdvancedCardSearchStore.ts';
import AdvancedSearchLayoutSelectors from '@/components/app/cards/AdvancedCardSearch/AdvancedSearchResults/AdvancedSearchLayoutSelectors.tsx';
import SearchCardLayout, {
  type SearchCardLayoutProps,
} from '@/components/app/cards/AdvancedCardSearch/AdvancedSearchResults/SearchCardLayout.tsx';
import { getMostPlayedCardIds } from './mostPlayedCards.ts';

interface MostPlayedCardsProps {
  deckId: string;
  cardSubcomponent: SearchCardLayoutProps['cardSubcomponent'];
}

export default function MostPlayedCards({ deckId, cardSubcomponent }: MostPlayedCardsProps) {
  const deckQuery = useGetDeck(deckId);
  const cardsQuery = useCardList();
  const deck = deckQuery.data?.deck;
  const cards = cardsQuery.data?.cards;
  const leader = deck?.leaderCardId1 ? cards?.[deck.leaderCardId1] : undefined;
  const secondLeader = deck?.leaderCardId2 ? cards?.[deck.leaderCardId2] : undefined;
  const base = deck?.baseCardId ? cards?.[deck.baseCardId] : undefined;
  const aspects = useMemo(
    () => [...(leader?.aspects ?? []), ...(secondLeader?.aspects ?? []), ...(base?.aspects ?? [])],
    [leader, secondLeader, base],
  );

  if (deckQuery.isError || cardsQuery.isError) {
    return (
      <div role="alert" className="p-6 text-center">
        <p>Unable to load your deck’s cards.</p>
        <Button
          variant="outline"
          className="mt-3"
          onClick={() => {
            void deckQuery.refetch();
            void cardsQuery.refetch();
          }}
        >
          Try again
        </Button>
      </div>
    );
  }
  if (!deck || !cards) return <LoadingCards />;
  if (!leader || !base || (deck.leaderCardId2 && !secondLeader)) {
    return (
      <p className="p-6 text-center text-muted-foreground">
        Choose a leader and base to see popular cards for your deck’s aspects.
      </p>
    );
  }

  return (
    <MostPlayedCardsResults
      format={deck.format}
      aspects={aspects}
      cards={cards}
      cardSubcomponent={cardSubcomponent}
    />
  );
}

function LoadingCards() {
  return (
    <div role="status" className="flex min-h-64 items-center justify-center gap-2">
      <Loader2 className="size-6 animate-spin text-primary" />
      Loading most played cards…
    </div>
  );
}

function MostPlayedCardsResults({
  format,
  aspects,
  cards,
  cardSubcomponent,
}: {
  format: number;
  aspects: Parameters<typeof getMostPlayedCardIds>[2];
  cards: Parameters<typeof getMostPlayedCardIds>[1];
  cardSubcomponent: SearchCardLayoutProps['cardSubcomponent'];
}) {
  const navigate = useNavigate();
  const { resultsLayout } = useAdvancedCardSearchStore();
  const metasQuery = useGetMetas({ format, sort: 'meta.date', order: 'desc', limit: 1 });
  const latestMeta = metasQuery.data?.data[0]?.meta;
  const statsQuery = useCardStats({ metaId: latestMeta?.id });
  const cardIds = useMemo(
    () => getMostPlayedCardIds(statsQuery.data?.data ?? [], cards, aspects),
    [statsQuery.data, cards, aspects],
  );

  const isError = metasQuery.isError || statsQuery.isError;
  const isLoading = metasQuery.isPending || (!!latestMeta && statsQuery.isPending);

  return (
    <section
      aria-label="Most played cards"
      className="min-w-0 flex-1 p-2 @[1080px]/main-body:flex @[1080px]/main-body:min-h-0 @[1080px]/main-body:flex-col"
    >
      <header className="mb-1 flex shrink-0 flex-wrap items-center justify-between gap-1 py-1 [&_nav_button]:h-8 [&_nav_button]:px-2 [&_nav_button]:text-xs">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1">
          <h3 className="m-0! hidden text-sm! leading-8! font-semibold tracking-tight @[1080px]/main-body:block">
            Most played cards
            {!isLoading && !isError && cardIds.length > 0 && (
              <span className="ml-2 text-sm text-muted-foreground">({cardIds.length} cards)</span>
            )}
          </h3>
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            <span className="mr-1">Your deck’s aspects</span>
            {aspects.map((aspect, index) => (
              <AspectIcon key={`${aspect}-${index}`} aspect={aspect} size="small" />
            ))}
            <span className="ml-1">+ neutral cards</span>
          </div>
        </div>
        <div className="hidden @[1080px]/main-body:block">
          <AdvancedSearchLayoutSelectors showSort={false} />
        </div>
      </header>
      {isError ? (
        <div
          role="alert"
          className="flex min-h-64 flex-col items-center justify-center gap-3 text-center"
        >
          <AlertCircle className="size-8 text-muted-foreground" />
          <p>Unable to load most played cards.</p>
          <Button
            variant="outline"
            onClick={() => {
              if (metasQuery.isError) void metasQuery.refetch();
              if (statsQuery.isError) void statsQuery.refetch();
            }}
          >
            Try again
          </Button>
        </div>
      ) : isLoading ? (
        <LoadingCards />
      ) : !latestMeta || cardIds.length === 0 ? (
        <div className="flex min-h-64 flex-col items-center justify-center gap-3 px-4 text-center">
          <TrendingUp className="size-10 text-muted-foreground" />
          <h3 className="text-xl font-semibold">No most played cards yet</h3>
          <p className="max-w-md text-sm text-muted-foreground">
            {!latestMeta
              ? 'No meta statistics are available for this deck’s format yet.'
              : !statsQuery.data?.data.length
                ? 'Card statistics for this meta are not available yet.'
                : 'No cards in this meta match your deck’s aspects yet.'}
          </p>
        </div>
      ) : (
        <ScrollArea className="h-[calc(100vh-90px)] @[1080px]/main-body:h-auto @[1080px]/main-body:min-h-0 @[1080px]/main-body:flex-1">
          <SearchCardLayout
            searchResults={cardIds}
            onCardClick={(cardId, variantId) =>
              navigate({
                to: '.',
                search: previous => getCardDetailDialogSearch(previous, cardId, variantId),
              })
            }
            layoutType={resultsLayout}
            cardSubcomponent={cardSubcomponent}
            showKarabastUnimplementedNameIcon
            preserveOrder
          />
        </ScrollArea>
      )}
    </section>
  );
}
