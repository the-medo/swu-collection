import DeckTable from '../DeckTable/DeckTable.tsx';
import { useMemo, useState } from 'react';
import { UserDeckData } from '../DeckTable/deckTableLib.tsx';
import DeckFiltersAccordion from '@/components/app/decks/DeckFilters/DeckFiltersAccordion.tsx';
import {
  useDeckFilterStore,
  useInitializeDeckFilterFromUrlParams,
} from '@/components/app/decks/DeckFilters/useDeckFilterStore.ts';
import { useGetDecks } from '@/api/decks/useGetDecks.ts';
import { Button } from '@/components/ui/button.tsx';
import { Loader2 } from 'lucide-react';
import { DeckBranch, DeckPullRequest } from '@/components/app/decks/deckWorkflowIcons.ts';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group.tsx';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select.tsx';

type BranchView = 'all' | 'branches' | 'branched';

interface UserDecksProps {
  userId: string | undefined;
  loading?: boolean;
}

const UserDecks: React.FC<UserDecksProps> = ({ userId, loading = false }) => {
  const initialized = useInitializeDeckFilterFromUrlParams();
  const { toRequestParams } = useDeckFilterStore();
  const [branchView, setBranchView] = useState<BranchView>('all');
  const [branchTeamId, setBranchTeamId] = useState('all');

  const { data, isFetching, hasNextPage, fetchNextPage, isFetchingNextPage } = useGetDecks({
    ...toRequestParams(userId),
    branchView,
    branchTeamId: branchTeamId === 'all' ? undefined : branchTeamId,
  });

  const decks: UserDeckData[] = useMemo(() => {
    if (!data) return [];
    return data.pages.flatMap(page => page.data || []);
  }, [data]);

  const isLoading = isFetching || loading;
  const branchTeams = useMemo(() => {
    const teams = new Map<string, { id: string; name: string; count: number }>();

    decks.forEach(row => {
      if (row.branchContext) {
        const existing = teams.get(row.branchContext.team.id);
        teams.set(row.branchContext.team.id, {
          id: row.branchContext.team.id,
          name: row.branchContext.team.name,
          count: (existing?.count ?? 0) + 1,
        });
      }

      row.openBranchTeams?.forEach(team => {
        const existing = teams.get(team.teamId);
        teams.set(team.teamId, {
          id: team.teamId,
          name: team.teamName,
          count: (existing?.count ?? 0) + team.count,
        });
      });
    });

    return [...teams.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [decks]);
  const showBranchControls = branchTeams.length > 0 || branchView !== 'all' || branchTeamId !== 'all';

  if (!initialized) {
    return (
      <>
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading{' '}
      </>
    );
  }

  return (
    <>
      <DeckFiltersAccordion initialized={initialized} />
      {showBranchControls && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-md border bg-muted/30 p-2">
          <ToggleGroup
            type="single"
            value={branchView}
            onValueChange={value => {
              if (value) setBranchView(value as BranchView);
            }}
            variant="outline"
            size="sm"
            className="justify-start"
          >
            <ToggleGroupItem value="all" aria-label="Show all decks">
              All decks
            </ToggleGroupItem>
            <ToggleGroupItem value="branches" aria-label="Show branch decks">
              <DeckBranch className="mr-1 h-3.5 w-3.5" />
              My branches
            </ToggleGroupItem>
            <ToggleGroupItem value="branched" aria-label="Show decks with open branches">
              <DeckPullRequest className="mr-1 h-3.5 w-3.5" />
              Open branches
            </ToggleGroupItem>
          </ToggleGroup>
          <Select value={branchTeamId} onValueChange={setBranchTeamId}>
            <SelectTrigger className="h-9 w-full sm:w-[240px]">
              <SelectValue placeholder="All teams" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All teams</SelectItem>
              {branchTeams.map(team => (
                <SelectItem key={team.id} value={team.id}>
                  {team.name} ({team.count})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <DeckTable variant="user" decks={decks} loading={isLoading} />

      {hasNextPage && (
        <div className="flex justify-center mt-4">
          <Button onClick={() => fetchNextPage()} disabled={isFetchingNextPage} variant="outline">
            {isFetchingNextPage ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading more
              </>
            ) : (
              'Load more decks'
            )}
          </Button>
        </div>
      )}
    </>
  );
};

export default UserDecks;
