import { limitedStyles } from '@/components/app/limited/limitedStyles';
import { toast } from '@/hooks/use-toast.ts';
import type { Deck } from '../../../../../../types/Deck.ts';
import { DeckArtwork } from '@/components/app/decks/DeckArtwork.tsx';
import { DeckIcon } from '@/components/app/global/icons/CardLibraryIcons.tsx';
import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button.tsx';
import { ArrowRight, Globe, Link as LinkIcon, Lock } from 'lucide-react';
import { cn } from '@/lib/utils.ts';

export interface DeckCardProps {
  deck: Deck;
  className?: string;
  author?: string;
}

export default function DeckCard({ deck, className, author }: DeckCardProps) {
  const hasArtwork = Boolean(deck.leaderCardId1 || deck.leaderCardId2 || deck.baseCardId);
  const VisibilityIcon = deck.public === 0 ? Lock : deck.public === 2 ? LinkIcon : Globe;
  const visibility = deck.public === 0 ? 'Private' : deck.public === 2 ? 'Unlisted' : 'Public';
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/limited/deck/${deck.id}`);
      toast({ title: 'Deck link copied' });
    } catch {
      toast({ variant: 'destructive', title: 'Could not copy the deck link.' });
    }
  };

  return (
    <article className={cn('group/deck-row', limitedStyles.deckCard, className)}>
      {hasArtwork ? (
        <div className={limitedStyles.deckCardArt}>
          <DeckArtwork
            leaderId={deck.leaderCardId1}
            leader2Id={deck.leaderCardId2}
            baseId={deck.baseCardId}
            size="compact"
          />
        </div>
      ) : (
        <div
          className={cn('text-[var(--limited-accent)]', limitedStyles.deckCardArt)}
          aria-hidden="true"
        >
          <DeckIcon size={28} />
        </div>
      )}
      <div className="min-w-0 px-2.5 pb-1.5 pt-2.5">
        <Link
          to="/limited/deck/$deckId"
          params={{ deckId: deck.id }}
          className={cn(
            'line-clamp-2 text-sm font-semibold leading-snug [overflow-wrap:anywhere]',
            limitedStyles.deckCardLink,
          )}
        >
          {deck.name || 'Untitled deck'}
        </Link>
        {!hasArtwork && (
          <div className="mt-1 text-[11px] text-muted-foreground">Choose a leader & base</div>
        )}
        {author && <div className="mt-1 truncate text-xs text-muted-foreground">{author}</div>}
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <VisibilityIcon size={11} aria-hidden="true" />
            {visibility}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="iconMedium"
              className="relative z-2 size-8 text-muted-foreground"
              onClick={handleCopy}
              aria-label={`Copy link to ${deck.name || 'Untitled deck'}`}
            >
              <LinkIcon size={13} />
            </Button>
            <ArrowRight size={15} className="text-[var(--limited-accent)]" aria-hidden="true" />
          </div>
        </div>
      </div>
    </article>
  );
}
