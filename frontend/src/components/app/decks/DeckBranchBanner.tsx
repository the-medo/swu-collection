import * as React from 'react';
import { Link } from '@tanstack/react-router';
import { ExternalLink, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Textarea } from '@/components/ui/textarea.tsx';
import Dialog from '@/components/app/global/Dialog.tsx';
import { useUser } from '@/hooks/useUser.ts';
import { useSubmitDeckChangeRequest } from '@/api/teams';
import type { DeckData } from '../../../../../types/Deck.ts';
import { DeckBranch, DeckPullRequest } from '@/components/app/decks/deckWorkflowIcons.ts';

type DeckBranchBannerProps = {
  deckData: DeckData;
};

const DeckBranchBanner: React.FC<DeckBranchBannerProps> = ({ deckData }) => {
  const user = useUser();
  const branchContext = deckData.branchContext;
  const [open, setOpen] = React.useState(false);
  const [title, setTitle] = React.useState(`Update ${branchContext?.baseDeck.name ?? 'deck'}`);
  const [description, setDescription] = React.useState('');
  const mutation = useSubmitDeckChangeRequest(branchContext?.branch.teamId, branchContext?.branch.id);

  if (!branchContext) return null;

  const isBranchCreator = user?.id === branchContext.branch.creatorUserId;
  const canSubmit =
    isBranchCreator && branchContext.branch.status === 'open' && !branchContext.changeRequest;

  const submit = () => {
    mutation.mutate(
      { title, description },
      {
        onSuccess: () => setOpen(false),
      },
    );
  };

  return (
    <div className="flex flex-col gap-3 rounded-md border bg-muted/40 p-3 text-sm md:flex-row md:items-center md:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border bg-background">
          <DeckBranch className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">Branch of</span>
            <Link
              to="/decks/$deckId"
              params={{ deckId: branchContext.baseDeck.id }}
              className="font-semibold underline-offset-4 hover:underline"
            >
              {branchContext.baseDeck.name}
            </Link>
            <Badge variant={branchContext.branch.status === 'open' ? 'secondary' : 'outline'}>
              {branchContext.branch.status}
            </Badge>
            {branchContext.changeRequest && (
              <Badge variant="outline">
                <DeckPullRequest className="mr-1 h-3 w-3" />
                request {branchContext.changeRequest.status}
              </Badge>
            )}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {branchContext.team.name} branch. Submit it when it is ready for review.
          </div>
        </div>
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">
        <Button asChild variant="outline" size="sm">
          <Link
            to="/teams/$teamId"
            params={{ teamId: branchContext.team.shortcut ?? branchContext.team.id }}
          >
            <ExternalLink className="h-4 w-4" />
            {branchContext.team.name}
          </Link>
        </Button>
        {canSubmit && (
          <Dialog
            open={open}
            onOpenChange={setOpen}
            header="Submit change request"
            headerDescription="Ask the original deck creator to review and merge this branch."
            trigger={
              <Button size="sm">
                <DeckPullRequest className="h-4 w-4" />
                Submit
              </Button>
            }
            footer={
              <Button onClick={submit} disabled={mutation.isPending || title.trim().length < 3}>
                {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Submit request
              </Button>
            }
          >
            <div className="flex flex-col gap-3 p-1">
              <Input value={title} onChange={e => setTitle(e.target.value)} />
              <Textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="What changed?"
              />
            </div>
          </Dialog>
        )}
      </div>
    </div>
  );
};

export default DeckBranchBanner;
