import { cn } from '@/lib/utils.ts';
import { Link } from '@tanstack/react-router';
import { ArrowRight, Users } from 'lucide-react';
import { useGetDecks } from '@/api/decks/useGetDecks.ts';
import { UserProfilePopover } from '@/components/app/users/UserProfilePopover.tsx';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar.tsx';
import { CompactDeckRow } from '../CompactDeckRow.tsx';
import { DeckFeedPanel } from './DeckFeedPanel.tsx';
import { PREMIER_FORMAT_ID } from '../../../../../../types/Format.ts';

export default function CommunityBrewing() {
  const query = useGetDecks(
    {
      excludeUserId: 'swubase',
      format: PREMIER_FORMAT_ID,
      sort: 'deck.created_at',
      order: 'desc',
      limit: 3,
    },
    { staleTime: 60_000, refetchOnMount: 'always' },
  );
  const decks = query.data?.pages[0]?.data.slice(0, 3) ?? [];

  return (
    <DeckFeedPanel
      id="today-brewing"
      className="today-brewing"
      title="What others are brewing"
      description="The newest public Premier decks from the community."
      isPending={query.isPending}
      isError={query.isError}
      isEmpty={decks.length === 0}
      loadingLabel="Loading community decks"
      errorMessage="Community decks couldn’t be loaded."
      retryLabel="Retry community decks"
      onRetry={() => void query.refetch()}
      empty={
        <>
          <Users size={30} strokeWidth={1.4} />
          <h3 className="m-0! text-[18px]! font-medium!">A fresh idea starts with you.</h3>
          <p className="max-w-72.5 m-0! text-muted-foreground text-[13px]! leading-[1.7]!">
            Make a Premier deck public to share it with the community.
          </p>
        </>
      }
      footer={
        <Link to="/decks/public">
          Explore public decks <ArrowRight size={14} />
        </Link>
      }
    >
      {decks.map(({ deck, user }) => (
        <CompactDeckRow
          key={deck.id}
          deckId={deck.id}
          name={deck.name}
          leaderId={deck.leaderCardId1}
          baseId={deck.baseCardId}
          className="today-community-deck"
          metadata={
            <UserProfilePopover user={user}>
              <button
                type="button"
                className={cn(
                  'today-community-author relative z-3 inline-flex items-center gap-[5px] min-w-0 max-w-full',
                  'rounded-[3px] text-left cursor-pointer',
                  'hover:text-[color:var(--today-accent)]',
                  'focus-visible:outline-2 focus-visible:outline-[var(--today-accent)] focus-visible:outline-offset-3',
                )}
                aria-label={`View ${user.displayName}'s profile`}
              >
                <Avatar className="size-4" aria-hidden="true">
                  <AvatarImage src={user.image ?? undefined} alt="" />
                  <AvatarFallback className="text-[8px]">
                    {user.displayName.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate">{user.displayName}</span>
              </button>
            </UserProfilePopover>
          }
        />
      ))}
    </DeckFeedPanel>
  );
}
