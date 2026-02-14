import * as React from 'react';
import { useState, useMemo } from 'react';
import { BookOpen, Link2, Loader2, Plus, Trash2 } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { useTeamDecks } from '@/api/teams/useTeamDecks.ts';
import { useAddTeamDeck } from '@/api/teams/useAddTeamDeck.ts';
import { useRemoveTeamDeck } from '@/api/teams/useRemoveTeamDeck.ts';
import { useGetDecks } from '@/api/decks/useGetDecks.ts';
import { useUser } from '@/hooks/useUser.ts';
import { useCardList } from '@/api/lists/useCardList.ts';
import { selectDefaultVariant } from '../../../../../../server/lib/cards/selectDefaultVariant.ts';
import { Button } from '@/components/ui/button.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Skeleton } from '@/components/ui/skeleton.tsx';
import { toast } from '@/hooks/use-toast.ts';
import CardImage from '@/components/app/global/CardImage.tsx';
import { getFormatName } from '@/components/app/decks/DeckTable/deckTableLib.tsx';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog.tsx';

interface TeamDecksTabProps {
  teamId: string;
}

const UUID_REGEX = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

const parseDeckId = (input: string): string | null => {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const match = trimmed.match(UUID_REGEX);
  return match ? match[0] : null;
};

const TeamDecksTab: React.FC<TeamDecksTabProps> = ({ teamId }) => {
  const user = useUser();
  const { data: cardList } = useCardList();
  const { data: teamDecks, isLoading: isLoadingTeamDecks } = useTeamDecks(teamId);
  const addDeckMutation = useAddTeamDeck(teamId);
  const removeDeckMutation = useRemoveTeamDeck(teamId);

  const [linkInput, setLinkInput] = useState('');
  const [deckToRemove, setDeckToRemove] = useState<{ id: string; name: string } | null>(null);

  const { data: recentDecksData, isLoading: isLoadingRecent } = useGetDecks({
    userId: user?.id,
    sort: 'deck.updated_at',
    order: 'desc',
  });

  const recentDecks = useMemo(() => {
    if (!recentDecksData) return [];
    return recentDecksData.pages.flatMap(page => page.data || []);
  }, [recentDecksData]);

  const teamDeckIds = useMemo(() => {
    return new Set(teamDecks?.map(td => td.deck.id) ?? []);
  }, [teamDecks]);

  const availableRecentDecks = useMemo(() => {
    return recentDecks.filter(d => !teamDeckIds.has(d.deck.id));
  }, [recentDecks, teamDeckIds]);

  const handleAddByLink = () => {
    const deckId = parseDeckId(linkInput);
    if (!deckId) {
      toast({
        variant: 'destructive',
        title: 'Invalid deck link',
        description: 'Please paste a valid deck link or deck ID.',
      });
      return;
    }
    addDeckMutation.mutate(deckId, {
      onSuccess: () => {
        setLinkInput('');
        toast({ title: 'Deck added to team' });
      },
    });
  };

  const handleAddRecent = (deckId: string) => {
    addDeckMutation.mutate(deckId, {
      onSuccess: () => {
        toast({ title: 'Deck added to team' });
      },
    });
  };

  const handleRemove = () => {
    if (!deckToRemove) return;
    removeDeckMutation.mutate(deckToRemove.id, {
      onSuccess: () => {
        toast({ title: 'Deck removed from team' });
        setDeckToRemove(null);
      },
    });
  };

  const renderLeaderBase = (deck: {
    leaderCardId1: string | null;
    leaderCardId2: string | null;
    baseCardId: string | null;
  }) => {
    const leader1 = deck.leaderCardId1 ? cardList?.cards[deck.leaderCardId1] : undefined;
    const leader2 = deck.leaderCardId2 ? cardList?.cards[deck.leaderCardId2] : undefined;
    const base = deck.baseCardId ? cardList?.cards[deck.baseCardId] : undefined;

    return (
      <div className="flex gap-1">
        <CardImage
          card={leader1}
          cardVariantId={leader1 ? selectDefaultVariant(leader1) : undefined}
          forceHorizontal={true}
          size="w100"
          backSideButton={false}
        >
          No leader
        </CardImage>
        {leader2 && (
          <div className="-ml-14">
            <CardImage
              card={leader2}
              cardVariantId={leader2 ? selectDefaultVariant(leader2) : undefined}
              forceHorizontal={true}
              size="w100"
              backSideButton={false}
            />
          </div>
        )}
        <div className={leader2 ? '-ml-12' : ''}>
          <CardImage
            card={base}
            cardVariantId={base ? selectDefaultVariant(base) : undefined}
            forceHorizontal={true}
            size="w100"
            backSideButton={false}
          >
            No base
          </CardImage>
        </div>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 py-4">
      {/* Left: Team Decks List */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Team Decks</h3>
        {isLoadingTeamDecks ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-12 w-24 rounded" />
                <Skeleton className="h-4 w-[150px]" />
              </div>
            ))}
          </div>
        ) : !teamDecks || teamDecks.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-12 text-center border rounded-lg">
            <BookOpen className="w-12 h-12 text-muted-foreground" />
            <p className="text-muted-foreground">
              No decks added yet. Use the panel on the right to add decks.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {teamDecks.map(td => (
              <div key={td.deck.id} className="flex items-center gap-3 p-3 rounded-lg border">
                {renderLeaderBase(td.deck)}
                <div className="flex flex-col flex-1 min-w-0">
                  <Link to={'/decks/' + td.deck.id}>
                    <Button variant="link" className="p-0 h-auto font-bold justify-start">
                      <span className="truncate">{td.deck.name}</span>
                    </Button>
                  </Link>
                  <span className="text-xs text-muted-foreground">
                    {getFormatName(td.deck.format)} · by {td.user.displayName ?? td.user.name}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="iconMedium"
                  onClick={() => setDeckToRemove({ id: td.deck.id, name: td.deck.name })}
                  disabled={removeDeckMutation.isPending}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Right: Add Deck Panel */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Add Deck</h3>
        <div className="flex flex-col gap-6">
          {/* Add by link */}
          <div className="flex flex-col gap-2 border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-1">
              <Link2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Paste deck link or ID</span>
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Deck link or UUID"
                value={linkInput}
                onChange={e => setLinkInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleAddByLink();
                }}
              />
              <Button
                onClick={handleAddByLink}
                disabled={addDeckMutation.isPending || !linkInput.trim()}
              >
                {addDeckMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                Add
              </Button>
            </div>
          </div>

          {/* Recent decks */}
          <div className="flex flex-col gap-2 border rounded-lg p-4">
            <span className="text-sm font-medium mb-1">Your recent decks</span>
            {isLoadingRecent ? (
              <div className="flex flex-col gap-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-10 w-20 rounded" />
                    <Skeleton className="h-4 w-[120px]" />
                  </div>
                ))}
              </div>
            ) : availableRecentDecks.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">
                {recentDecks.length === 0
                  ? 'You have no decks yet.'
                  : 'All your recent decks are already in this team.'}
              </p>
            ) : (
              <div className="flex flex-col gap-2 max-h-[400px] overflow-y-auto">
                {availableRecentDecks.map(d => (
                  <div
                    key={d.deck.id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent transition-colors"
                  >
                    {renderLeaderBase(d.deck)}
                    <div className="flex flex-col flex-1 min-w-0">
                      <span className="text-sm font-medium truncate">{d.deck.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {getFormatName(d.deck.format)}
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAddRecent(d.deck.id)}
                      disabled={addDeckMutation.isPending}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      <AlertDialog
        open={!!deckToRemove}
        onOpenChange={open => {
          if (!open) setDeckToRemove(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove deck from team</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove <strong>{deckToRemove?.name}</strong> from this team?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemove} disabled={removeDeckMutation.isPending}>
              {removeDeckMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : null}
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default TeamDecksTab;
