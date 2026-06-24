import * as React from 'react';
import { Link } from '@tanstack/react-router';
import {
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuTrigger,
} from '@/components/ui/navigation-menu.tsx';
import { Badge } from '@/components/ui/badge.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Loader2 } from 'lucide-react';
import { useDeckBranches } from '@/api/decks/useDeckBranches.ts';
import { useGetDeck } from '@/api/decks/useGetDeck.ts';
import { RequestReviewDialog } from '@/components/app/teams/TeamPage/TeamChangeRequestsTab.tsx';
import type { Deck } from '../../../../../../../../types/Deck.ts';
import type { DeckChangeRequestListItem } from '../../../../../../../../types/ZDeckBranch.ts';
import { DeckBranch, DeckPullRequest } from '@/components/app/decks/deckWorkflowIcons.ts';

type DeckBranchesMenuProps = {
  deckId: string;
};

const DeckBranchesMenu: React.FC<DeckBranchesMenuProps> = ({ deckId }) => {
  const { data: deckData } = useGetDeck(deckId);
  const openBranchCount = deckData?.openBranchCount ?? 0;
  const openChangeRequestCount = deckData?.openChangeRequestCount ?? 0;
  const enabled = openBranchCount > 0 && !deckData?.branchContext;
  const { data: branches, isLoading } = useDeckBranches(deckId, enabled);
  const [selectedReview, setSelectedReview] = React.useState<{
    teamId: string;
    requestRow: DeckChangeRequestListItem;
  }>();

  if (!enabled) return null;

  const requestedBranches = branches?.filter(row => !!row.changeRequest) ?? [];
  const draftBranches = branches?.filter(row => !row.changeRequest) ?? [];

  return (
    <>
    <NavigationMenuItem>
      <NavigationMenuTrigger className="justify-start border">
        <DeckPullRequest className="h-4 w-4" />
        <span>Branches</span>
        {openChangeRequestCount > 0 && (
          <Badge variant="secondary" className="ml-1 h-5 px-1.5">
            {openChangeRequestCount}
          </Badge>
        )}
      </NavigationMenuTrigger>
      <NavigationMenuContent>
        <div className="w-[340px] p-2">
          {isLoading ? (
            <div className="flex items-center gap-2 p-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading branches
            </div>
          ) : (
            <div className="grid gap-3">
              {requestedBranches.length > 0 && (
                <BranchSection title="Change requests" count={requestedBranches.length}>
                  {requestedBranches.map(row => (
                    <BranchRow
                      key={row.branch.id}
                      row={row}
                      baseDeck={deckData?.deck}
                      primaryAction="Review"
                      onReview={requestRow => setSelectedReview({ teamId: row.team.id, requestRow })}
                    />
                  ))}
                </BranchSection>
              )}
              {draftBranches.length > 0 && (
                <BranchSection title="Draft branches" count={draftBranches.length}>
                  {draftBranches.map(row => (
                    <BranchRow
                      key={row.branch.id}
                      row={row}
                      baseDeck={deckData?.deck}
                      primaryAction="Open"
                      onReview={requestRow => setSelectedReview({ teamId: row.team.id, requestRow })}
                    />
                  ))}
                </BranchSection>
              )}
              {!branches || branches.length === 0 ? (
                <div className="p-2 text-sm text-muted-foreground">No open branches.</div>
              ) : null}
            </div>
          )}
        </div>
      </NavigationMenuContent>
    </NavigationMenuItem>
    {selectedReview && (
      <RequestReviewDialog
        teamId={selectedReview.teamId}
        requestRow={selectedReview.requestRow}
        open={!!selectedReview}
        onOpenChange={open => {
          if (!open) setSelectedReview(undefined);
        }}
        trigger={<button type="button" className="hidden" tabIndex={-1} aria-hidden="true" />}
      />
    )}
    </>
  );
};

function BranchSection({
  title,
  count,
  children,
}: React.PropsWithChildren<{ title: string; count: number }>) {
  return (
    <section>
      <div className="mb-1 flex items-center justify-between px-2 text-xs font-semibold text-muted-foreground">
        <span>{title}</span>
        <span>{count}</span>
      </div>
      <div className="grid gap-1">{children}</div>
    </section>
  );
}

type BranchRowProps = {
  row: NonNullable<ReturnType<typeof useDeckBranches>['data']>[number];
  baseDeck: Deck | undefined;
  primaryAction: 'Review' | 'Open';
  onReview: (requestRow: DeckChangeRequestListItem) => void;
};

function BranchRow({ row, baseDeck, primaryAction, onReview }: BranchRowProps) {
  const requestRow =
    row.changeRequest && baseDeck
      ? {
          changeRequest: row.changeRequest,
          branch: row.branch,
          branchDeck: row.branchDeck,
          baseDeck,
          author: row.creator,
        }
      : undefined;

  return (
    <div className="rounded-md border bg-background/80 p-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-sm font-medium">{row.branchDeck.name}</div>
          <div className="mt-0.5 truncate text-xs text-muted-foreground">
            {row.creator.displayName ?? row.creator.name} · {row.team.name}
          </div>
        </div>
        <Badge variant={row.changeRequest ? 'secondary' : 'outline'} size="small">
          {row.changeRequest ? 'review' : 'draft'}
        </Badge>
      </div>
      <div className="mt-2 flex gap-2">
        {requestRow ? (
          <Button onClick={() => onReview(requestRow)} size="sm">
            <DeckPullRequest className="h-4 w-4" />
            Review
          </Button>
        ) : (
          <Button asChild variant="outline" size="sm">
            <Link to="/teams/$teamId" params={{ teamId: row.team.shortcut ?? row.team.id }}>
              <DeckPullRequest className="h-4 w-4" />
              {primaryAction}
            </Link>
          </Button>
        )}
        <Button asChild variant="ghost" size="sm">
          <Link to="/decks/$deckId" params={{ deckId: row.branchDeck.id }}>
            <DeckBranch className="h-4 w-4" />
            Branch
          </Link>
        </Button>
      </div>
    </div>
  );
}

export default DeckBranchesMenu;
