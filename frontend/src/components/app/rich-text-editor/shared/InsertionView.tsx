import { Pencil, Lightbulb, TriangleAlert, Sparkles } from 'lucide-react';
import { useCardList } from '@/api/lists/useCardList.ts';
import { Button } from '@/components/ui/button.tsx';
import { MatchupCard } from '@/components/app/global/MatchupCard.tsx';
import { CardArtwork, CardLink, DecklistEmbed } from './Embeds.tsx';
import { MetaEmbed } from './MetaEmbed.tsx';
import { useContext } from 'react';
import { InsertionContext } from './insertionContext.ts';
import { profileHref, type Insertion } from './model.ts';

export function InsertionView({
  value,
  onChange,
}: {
  value: Insertion;
  onChange?: (value: Insertion) => void;
}) {
  const request = useContext(InsertionContext);
  const catalog = useCardList();
  if (value.kind === 'card-link') return <CardLink card={value.card} />;
  if (value.kind === 'decklist') return <DecklistEmbed deck={value.deck} />;
  if (value.kind === 'mention')
    return (
      <a
        className="rte-mention rounded bg-accent px-1 font-medium"
        href={profileHref(value.user.id)}
        target="_blank"
        rel="noopener noreferrer"
      >
        @{value.user.displayName}
      </a>
    );
  const Icon =
    value.kind === 'callout' && value.tone === 'warning'
      ? TriangleAlert
      : value.kind === 'callout' && value.tone === 'key-play'
        ? Sparkles
        : Lightbulb;
  return (
    <div
      className={`rte-widget rte-widget-${value.kind} my-4 w-full min-w-0 rounded-xl border bg-card p-3 sm:p-4`}
      data-widget-kind={value.kind}
    >
      {onChange && request && (
        <div className="mb-2 flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            aria-label={`Edit ${value.kind}`}
            onClick={async event => {
              const button = event.currentTarget;
              const next = await request(value.kind, value);
              if (next) onChange(next);
              requestAnimationFrame(() => {
                if (button.isConnected) button.focus();
              });
            }}
          >
            <Pencil className="mr-1 size-3" />
            Edit
          </Button>
        </div>
      )}
      {value.kind === 'card-image' ? (
        <CardArtwork card={value.card} size={value.size} />
      ) : value.kind === 'meta-analysis' ? (
        <MetaEmbed value={value} onChange={onChange} />
      ) : value.kind === 'matchup' ? (
        <MatchupCard
          leaderCardId={value.leftLeader}
          baseCardKey={value.leftBase}
          opponentLeaderCardId={value.rightLeader}
          opponentBaseCardKey={value.rightBase}
        >
          <span className="sr-only">
            {catalog.data?.cards[value.leftLeader]?.name ?? value.leftLeader}
            {value.leftBase
              ? ` / ${catalog.data?.cards[value.leftBase]?.name ?? value.leftBase}`
              : ''}
            {' versus '}
            {catalog.data?.cards[value.rightLeader]?.name ?? value.rightLeader}
            {value.rightBase
              ? ` / ${catalog.data?.cards[value.rightBase]?.name ?? value.rightBase}`
              : ''}
          </span>
          {value.title && <strong className="break-words text-base">{value.title}</strong>}
          {value.subtitle && (
            <div className="break-words text-sm text-muted-foreground">{value.subtitle}</div>
          )}
          <p className="whitespace-pre-wrap break-words text-sm">{value.text}</p>
        </MatchupCard>
      ) : value.kind === 'card-group' ? (
        <>
          <div className="rte-card-group flex flex-wrap items-start gap-4">
            {value.cards.map((card, index) => (
              <CardArtwork key={`${card.cardId}-${index}`} card={card} size={value.size} />
            ))}
          </div>
          {value.text && (
            <p className="mt-3 whitespace-pre-wrap break-words text-sm">{value.text}</p>
          )}
        </>
      ) : (
        <aside className="flex gap-3 border-l-4 border-primary pl-3">
          <Icon className="mt-1 size-5 shrink-0" />
          <div>
            <strong>{value.title}</strong>
            <p className="mt-1 whitespace-pre-wrap break-words text-sm">{value.text}</p>
          </div>
        </aside>
      )}
    </div>
  );
}
