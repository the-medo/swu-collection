import * as React from 'react';
import { Link } from '@tanstack/react-router';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button.tsx';
import { getFormatName } from '@/components/app/decks/DeckTable/deckTableLib.tsx';
import DeckBackgroundDecoration from '@/components/app/global/DeckBackgroundDecoration.tsx';
import BaseAvatar from '@/components/app/global/BaseAvatar.tsx';
import { useCardList } from '@/api/lists/useCardList.ts';
import type { TeamDeckExpanded } from '../../../../../../../server/routes/teams/_id/decks/get.ts';
import CopyLinkButton from '@/components/app/decks/DeckContents/DeckActionsMenu/components/CopyLinkButton.tsx';

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
  deck: TeamDeckExpanded['deck'];
  onAdd: () => void;
  addDisabled?: boolean;
}

type DeckListItemProps = TeamDeckVariantProps | AddDeckVariantProps;

const DeckListItem: React.FC<DeckListItemProps> = props => {
  const { variant, teamId } = props;
  const deck = variant === 'team-deck' ? props.teamDeck.deck : props.deck;
  const { data: cardList } = useCardList();

  const leader = deck.leaderCardId1 ? cardList?.cards[deck.leaderCardId1] : undefined;
  const base = deck.baseCardId ? cardList?.cards[deck.baseCardId] : undefined;

  if (variant === 'team-deck') {
    const { teamDeck, onRemove, removeDisabled } = props;
    const userName = teamDeck.user.displayName ?? teamDeck.user.name;
    return (
      <div className="flex items-center gap-3 p-3 rounded-lg border relative overflow-hidden min-h-14">
        {leader && (
          <DeckBackgroundDecoration leaderCard={leader} baseCard={base} position="top-left">
            <BaseAvatar
              cardId={deck.baseCardId ?? undefined}
              bordered={false}
              size="40"
              shape="circle"
            />
          </DeckBackgroundDecoration>
        )}
        <div className="flex flex-col flex-1 min-w-0 pl-40 relative z-10">
          <Link
            to={'/teams/$teamId/statistics/decks'}
            params={{
              teamId,
            }}
            search={{
              sDeckId: deck.id,
            }}
          >
            <Button variant="link" className="p-0 h-auto font-bold justify-start max-w-full">
              <span className="truncate">{deck.name}</span>
            </Button>
          </Link>
          <span className="text-xs text-muted-foreground">
            {getFormatName(deck.format)} · by {userName}
          </span>
        </div>
        <CopyLinkButton deckId={deck.id} isPublic={true} compact={true} size="iconMedium" />
        <Button
          variant="ghost"
          size="iconMedium"
          className="relative z-10"
          onClick={onRemove}
          disabled={removeDisabled}
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
    );
  }

  const { onAdd, addDisabled } = props;
  return (
    <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent transition-colors relative overflow-hidden min-h-14">
      {leader && (
        <DeckBackgroundDecoration leaderCard={leader} baseCard={base} position="top-left">
          <BaseAvatar
            cardId={deck.baseCardId ?? undefined}
            bordered={false}
            size="40"
            shape="circle"
          />
        </DeckBackgroundDecoration>
      )}
      <div className="flex flex-col flex-1 min-w-0 pl-42 relative z-10">
        <span className="text-sm font-medium truncate">{deck.name}</span>
        <span className="text-xs text-muted-foreground">{getFormatName(deck.format)}</span>
      </div>
      <Button
        variant="outline"
        size="sm"
        className="relative z-10"
        onClick={onAdd}
        disabled={addDisabled}
      >
        <Plus className="h-3 w-3 mr-1" />
        Add
      </Button>
    </div>
  );
};

export default DeckListItem;
