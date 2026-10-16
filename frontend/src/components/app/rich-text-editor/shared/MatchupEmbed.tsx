import { DeckArtwork } from '@/components/app/decks/DeckArtwork.tsx';
import { cn } from '@/lib/utils.ts';
import type { Widget } from './model.ts';
import { CommentsContent } from '../blocknote/CommentsContent.tsx';
import './matchup.css';

export function MatchupEmbed({ value }: { value: Extract<Widget, { kind: 'matchup' }> }) {
  const hasLeft = Boolean(value.leftLeader || value.leftBase);
  const hasRight = Boolean(value.rightLeader || value.rightBase);

  return (
    <div className="rte-matchup @container space-y-4">
      <div
        className={cn(
          'rte-matchup-header grid min-h-20 items-center gap-3 py-2',
          hasLeft && hasRight
            ? 'grid-cols-[auto_minmax(0,1fr)_auto]'
            : hasLeft
              ? 'grid-cols-[auto_minmax(0,1fr)]'
              : hasRight
                ? 'grid-cols-[minmax(0,1fr)_auto]'
                : 'grid-cols-1',
        )}
      >
        {hasLeft && (
          <div className="rte-matchup-deck" data-matchup-side="left">
            <span className="sr-only">Your deck:</span>
            <DeckArtwork leaderId={value.leftLeader} baseId={value.leftBase} />
          </div>
        )}
        <div
          className={cn(
            'rte-matchup-heading min-w-0 space-y-1 [overflow-wrap:anywhere]',
            hasLeft && hasRight ? 'text-center' : hasLeft ? 'text-right' : 'text-left',
          )}
        >
          {value.title && <strong className="block text-xl leading-snug">{value.title}</strong>}
          {value.subtitle && (
            <div className="text-sm leading-snug text-muted-foreground">{value.subtitle}</div>
          )}
        </div>
        {hasRight && (
          <div className="rte-matchup-deck" data-matchup-side="right">
            <span className="sr-only">Opponent:</span>
            <DeckArtwork leaderId={value.rightLeader} baseId={value.rightBase} />
          </div>
        )}
      </div>
      <div className="rte-matchup-notes min-w-0 text-sm [overflow-wrap:anywhere]">
        <CommentsContent key={JSON.stringify(value.notes)} content={value.notes} />
      </div>
      {value.footer && (
        <p className="rte-matchup-footer whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground [overflow-wrap:anywhere]">
          {value.footer}
        </p>
      )}
    </div>
  );
}
