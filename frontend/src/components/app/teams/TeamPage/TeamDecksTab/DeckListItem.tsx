import * as React from 'react';
import { Link } from '@tanstack/react-router';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button.tsx';
import { getFormatName } from '@/components/app/decks/DeckTable/deckTableLib.tsx';
import { LeaderBaseArtwork } from '@/components/app/global/LeaderBaseArtwork.tsx';
import type { TeamDeckExpanded } from '../../../../../../../server/routes/teams/_id/decks/get.ts';
import CopyLinkButton from '@/components/app/decks/DeckContents/DeckActionsMenu/components/CopyLinkButton.tsx';
import { UserDisplay } from '@/components/app/global/UserDisplay.tsx';

type DeckListItemDeck = Pick<
  TeamDeckExpanded['deck'],
  'id' | 'name' | 'format' | 'leaderCardId1' | 'leaderCardId2' | 'baseCardId'
>;

interface TeamDeckVariantProps {
  variant: 'team-deck';
  teamId: string;
  teamDeck: TeamDeckExpanded;
  onRemove: () => void;
  removeDisabled?: boolean;
}

interface AddDeckVariantProps {
  variant: 'add-deck';
  teamId: string;
  deck: DeckListItemDeck;
  onAdd: () => void;
  addDisabled?: boolean;
}

type DeckListItemProps = TeamDeckVariantProps | AddDeckVariantProps;

const DeckListItem: React.FC<DeckListItemProps> = props => {
  const { variant, teamId } = props;
  const deck = variant === 'team-deck' ? props.teamDeck.deck : props.deck;

  if (variant === 'team-deck') {
    const { teamDeck, onRemove, removeDisabled } = props;
    return (
      <div className="@container/team-deck-row flex items-center gap-3 rounded-lg border bg-card p-2.5">
        <LeaderBaseArtwork leaderId={deck.leaderCardId1} baseKey={deck.baseCardId} size="compact" />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <Link
            className="truncate text-sm font-semibold hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            title={deck.name}
            to={'/teams/$teamId/statistics/decks'}
            params={{
              teamId,
            }}
            search={{
              sDeckId: deck.id,
            }}
          >
            {deck.name}
          </Link>
          <span className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
            {getFormatName(deck.format)} · by <UserDisplay user={teamDeck.user} />
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-1 @max-[300px]/team-deck-row:flex-col">
          <CopyLinkButton deckId={deck.id} isPublic={true} compact={true} size="iconMedium" />
          <Button
            variant="ghost"
            size="iconMedium"
            aria-label={`Remove ${deck.name} from team`}
            onClick={onRemove}
            disabled={removeDisabled}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </div>
    );
  }

  const { onAdd, addDisabled } = props;
  return (
    <div className="@container/team-deck-row flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-accent">
      <LeaderBaseArtwork leaderId={deck.leaderCardId1} baseKey={deck.baseCardId} size="compact" />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="truncate text-sm font-medium" title={deck.name}>
          {deck.name}
        </span>
        <span className="text-xs text-muted-foreground">{getFormatName(deck.format)}</span>
      </div>
      <Button
        variant="outline"
        size="sm"
        className="size-8 shrink-0 gap-1 p-0 @min-[300px]/team-deck-row:w-auto @min-[300px]/team-deck-row:px-3"
        aria-label={`Add ${deck.name} to team`}
        title={`Add ${deck.name} to team`}
        onClick={onAdd}
        disabled={addDisabled}
      >
        <Plus className="h-3 w-3" />
        <span className="hidden @min-[300px]/team-deck-row:inline">Add</span>
      </Button>
    </div>
  );
};

export default DeckListItem;
