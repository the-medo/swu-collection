import { Pencil, Lightbulb, TriangleAlert, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button.tsx';
import { MatchupEmbed } from './MatchupEmbed.tsx';
import { CardArtwork, DecklistEmbed } from './Embeds.tsx';
import { MetaEmbed } from './MetaEmbed.tsx';
import { AlbumEmbed } from './AlbumEmbed.tsx';
import { PoolEmbed } from './PoolEmbed.tsx';
import { useContext } from 'react';
import { InsertionContext } from './insertionContext.ts';
import type { Insertion, EditorInsertion } from './model.ts';
import { InlineInsertionView } from './InlineInsertionView.tsx';
import { cn } from '@/lib/utils.ts';

export function InsertionView({
  value,
  onChange,
}: {
  value: Insertion;
  onChange?: (value: EditorInsertion) => void;
}) {
  const request = useContext(InsertionContext);
  if (value.kind === 'card-link' || value.kind === 'mention')
    return <InlineInsertionView value={value} />;
  if (value.kind === 'decklist') return <DecklistEmbed deck={value.deck} />;
  const Icon =
    value.kind === 'callout' && value.tone === 'warning'
      ? TriangleAlert
      : value.kind === 'callout' && value.tone === 'key-play'
        ? Sparkles
        : Lightbulb;
  return (
    <div
      className={cn(
        `rte-widget rte-widget-${value.kind} w-full min-w-0`,
        value.kind !== 'pool' && 'rounded-xl border bg-card p-3 sm:p-4',
        value.kind === 'matchup' ? 'my-1' : 'my-4',
      )}
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
        <MatchupEmbed value={value} />
      ) : value.kind === 'album' ? (
        <AlbumEmbed albumId={value.albumId} />
      ) : value.kind === 'pool' ? (
        <PoolEmbed poolId={value.poolId} />
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
        <aside
          className={cn(
            'flex gap-3 border-l-4 pl-3',
            value.tone === 'warning'
              ? 'border-amber-500 dark:border-amber-400'
              : value.tone === 'key-play'
                ? 'border-violet-500 dark:border-violet-400'
                : 'border-blue-500 dark:border-blue-400',
          )}
        >
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
