import * as React from 'react';
import { useState, useMemo } from 'react';
import { useInfiniteQueryScroll } from '@/hooks/useInfiniteQueryScroll.ts';
import { BookOpen, Link2, Loader2, Plus } from 'lucide-react';
import { useTeamDecks } from '@/api/teams/useTeamDecks.ts';
import { useAddTeamDeck } from '@/api/teams/useAddTeamDeck.ts';
import { useRemoveTeamDeck } from '@/api/teams/useRemoveTeamDeck.ts';
import { useGetDecks } from '@/api/decks/useGetDecks.ts';
import { useUser } from '@/hooks/useUser.ts';
import { Button } from '@/components/ui/button.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Skeleton } from '@/components/ui/skeleton.tsx';
import { toast } from '@/hooks/use-toast.ts';
import DeckListItem from '@/components/app/teams/TeamPage/TeamDecksTab/DeckListItem.tsx';
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
import { Alert } from '@/components/ui/alert.tsx';

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
  const {
    data: teamDecksData,
    isLoading: isLoadingTeamDecks,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useTeamDecks(teamId);

  const { observerTarget } = useInfiniteQueryScroll({
    fetchNextPage,
    hasNextPage: !!hasNextPage,
    isFetchingNextPage,
    isLoading: isLoadingTeamDecks,
  });

  const teamDecks = useMemo(() => {
    if (!teamDecksData) return undefined;
    return teamDecksData.pages.flatMap(page => page.data || []);
  }, [teamDecksData]);
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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 py-4">
      {/* Left: Team Decks List */}
      <div>
        <div className="flex gap-4 justify-between items-center">
          <h3 className="text-lg font-semibold mb-3">Team Decks</h3>
          <Alert variant="warning" size="xs" className="text-xs flex flex-1 p">
            Removing decks form team will also remove them from team statistics (even historical
            ones).
          </Alert>
        </div>
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
            <p className="text-muted-foreground">No decks added to the team yet.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {teamDecks.map(td => (
              <DeckListItem
                key={td.deck.id}
                variant="team-deck"
                teamDeck={td}
                onRemove={() => setDeckToRemove({ id: td.deck.id, name: td.deck.name })}
                removeDisabled={removeDeckMutation.isPending}
              />
            ))}
            {isFetchingNextPage && (
              <div className="flex justify-center py-2">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            )}
            <div ref={observerTarget} />
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
                  <DeckListItem
                    key={d.deck.id}
                    variant="add-deck"
                    deck={d.deck}
                    onAdd={() => handleAddRecent(d.deck.id)}
                    addDisabled={addDeckMutation.isPending}
                  />
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
