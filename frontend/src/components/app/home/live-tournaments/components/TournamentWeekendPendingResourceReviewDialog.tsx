import { useGetTournamentWeekendResources } from '@/api/tournament-weekends';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog.tsx';
import { TournamentWeekendResourceTable } from './TournamentWeekendResourceTable.tsx';

export function TournamentWeekendPendingResourceReviewDialog({
  open,
  onOpenChange,
  weekendId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  weekendId: string;
}) {
  const { data, isLoading, isError, error } = useGetTournamentWeekendResources(
    weekendId,
    'pending',
    open,
  );
  const resources = data?.data ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] w-[min(96vw,1100px)] max-w-5xl overflow-hidden">
        <DialogHeader className="pr-8">
          <DialogTitle>Review pending resources</DialogTitle>
          <DialogDescription>
            Approve or delete resource submissions for the current live weekend without leaving
            this page.
          </DialogDescription>
        </DialogHeader>

        {isError ? (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error?.message ?? 'Failed to load pending resources.'}
          </div>
        ) : (
          <div className="max-h-[65vh] overflow-auto">
            <TournamentWeekendResourceTable
              weekendId={weekendId}
              resources={resources}
              isLoading={isLoading}
              isAdmin
              emptyMessage="No pending resources for this weekend."
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
