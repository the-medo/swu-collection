import { cn } from '@/lib/utils.ts';
import { Link } from '@tanstack/react-router';
import { formatDistanceToNow } from 'date-fns';
import { ArrowRight, Clock3, Layers3 } from 'lucide-react';
import { useGetDecks } from '@/api/decks/useGetDecks.ts';
import { Button } from '@/components/ui/button.tsx';
import { useSession } from '@/lib/auth-client.ts';
import { CompactDeckRow } from '../CompactDeckRow.tsx';
import { DeckFeedPanel } from './DeckFeedPanel.tsx';
import { PREMIER_FORMAT_ID } from '../../../../../../types/Format.ts';

export default function ContinueDecks() {
  const session = useSession();
  const userId = session.data?.user.id;
  const query = useGetDecks(
    { userId, format: PREMIER_FORMAT_ID, sort: 'deck.updated_at', order: 'desc', limit: 3 },
    {
      enabled: !!userId && !session.isPending && !session.error,
      sessionScoped: true,
      staleTime: 0,
      refetchOnMount: 'always',
    },
  );
  const decks = query.data?.pages[0]?.data.slice(0, 3) ?? [];
  if (session.isPending || session.error || !userId) return null;

  return (
    <DeckFeedPanel
      id="today-continue"
      className="today-continue"
      title="Continue with your decks"
      description="Your three most recently updated Premier decks."
      isPending={query.isPending}
      isError={query.isError}
      isEmpty={decks.length === 0}
      loadingLabel="Loading your recent decks"
      errorMessage="Your decks couldn’t be loaded."
      retryLabel="Retry loading decks"
      onRetry={() => void query.refetch()}
      empty={
        <>
          <Layers3 size={30} strokeWidth={1.4} />
          <h3 className="m-0! text-[18px]! font-medium!">Make room for your next idea.</h3>
          <p className="max-w-72.5 m-0! text-muted-foreground text-[13px]! leading-[1.7]!">
            Create a Premier deck and it will be ready to continue here.
          </p>
          <Button asChild>
            <Link to="/decks/your">
              Open your decks <ArrowRight size={15} />
            </Link>
          </Button>
        </>
      }
      footer={
        <>
          <Link to="/decks/your">
            View all your decks <ArrowRight size={14} />
          </Link>
          <span>Premier</span>
        </>
      }
    >
      {decks.map(({ deck }) => (
        <CompactDeckRow
          key={deck.id}
          deckId={deck.id}
          name={deck.name}
          leaderId={deck.leaderCardId1}
          baseId={deck.baseCardId}
          className="today-resume-deck"
          metadata={
            <>
              <span
                className={cn(
                  'today-resume-updated inline-flex items-center gap-1 min-w-0',
                  '[&_svg]:shrink-0',
                  '[&_time]:overflow-hidden [&_time]:text-ellipsis [&_time]:whitespace-nowrap',
                )}
              >
                <Clock3 size={10} />
                <time dateTime={deck.updatedAt} title={new Date(deck.updatedAt).toLocaleString()}>
                  {formatDistanceToNow(new Date(deck.updatedAt), { addSuffix: true })}
                </time>
              </span>
              <span
                className={cn(
                  'today-resume-visibility text-[9px]',
                  "[&::before]:content-['·'] [&::before]:mr-2",
                )}
              >
                {deck.public === 0 ? 'Private' : deck.public === 2 ? 'Unlisted' : 'Public'}
              </span>
            </>
          }
        />
      ))}
    </DeckFeedPanel>
  );
}
