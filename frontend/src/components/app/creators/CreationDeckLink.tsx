import { ArrowUpRight } from 'lucide-react';
import { useGetDeck } from '@/api/decks/useGetDeck.ts';
import { DeckArtwork } from '@/components/app/decks/DeckArtwork.tsx';
import { Skeleton } from '@/components/ui/skeleton.tsx';
import { Button } from '@/components/ui/button.tsx';
import {
  deckBuilderSourceLabels,
  getDeckBuilderDeckLink,
} from '../../../../../types/DeckImport.ts';

export function CreationDeckLink({
  deckId,
  href,
  label,
}: {
  deckId: string;
  href: string;
  label: string;
}) {
  const { data, isPending } = useGetDeck(deckId);
  const deck = data?.deck;
  const source = data?.importSource;
  const originalHref = source && getDeckBuilderDeckLink(source.source, source.sourceDeckId);
  return (
    <div className="grid min-w-0 gap-2">
      <a
        href={href}
        aria-label={`Open decklist: ${label}`}
        className="group/deck-row flex min-w-0 items-center gap-3 rounded-xl border border-[var(--creator-border)] bg-background px-3 py-4 text-[var(--creator-accent)] transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        {isPending ? (
          <Skeleton aria-hidden="true" className="h-8 w-23 shrink-0 rounded-md" />
        ) : deck ? (
          <DeckArtwork
            leaderId={deck.leaderCardId1}
            leader2Id={deck.leaderCardId2}
            baseId={deck.baseCardId}
            size="compact"
          />
        ) : null}
        <span className="min-w-0 flex-1">
          <span className="block break-words text-[13px] font-semibold">{label}</span>
          <span className="mt-1 inline-flex items-center gap-1 text-[11px]">
            Open decklist <ArrowUpRight aria-hidden="true" className="size-3 shrink-0" />
          </span>
        </span>
      </a>
      {source && originalHref && (
        <Button
          asChild
          variant="outline"
          className="h-auto min-h-9 min-w-0 justify-between whitespace-normal border-[var(--creator-border)] px-3 py-2 text-left text-[11px] text-[var(--creator-accent)]"
        >
          <a href={originalHref} target="_blank" rel="noopener noreferrer">
            <span className="min-w-0 break-words">
              Original {deckBuilderSourceLabels[source.source]} link
            </span>
            <ArrowUpRight aria-hidden="true" className="shrink-0" />
          </a>
        </Button>
      )}
    </div>
  );
}
