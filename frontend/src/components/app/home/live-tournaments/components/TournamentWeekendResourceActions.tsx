import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import {
  useDeleteTournamentWeekendResource,
  useUpdateTournamentWeekendResource,
} from '@/api/tournament-weekends';
import { Button } from '@/components/ui/button.tsx';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog.tsx';
import { toast } from '@/hooks/use-toast.ts';

export function TournamentWeekendResourceActions({
  weekendId,
  resourceId,
  approved,
}: {
  weekendId?: string;
  resourceId: string;
  approved: boolean;
}) {
  const updateResource = useUpdateTournamentWeekendResource(weekendId);
  const deleteResource = useDeleteTournamentWeekendResource(weekendId);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const isMutating = updateResource.isPending || deleteResource.isPending;

  const approve = async () => {
    try {
      await updateResource.mutateAsync({ resourceId, data: { approved: true } });
      toast({
        title: 'Resource approved',
        description: 'The resource is now available in the live tournament views.',
      });
    } catch (error) {
      toast({
        title: 'Failed to approve resource',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    }
  };

  const remove = async () => {
    try {
      await deleteResource.mutateAsync(resourceId);
      setConfirmDelete(false);
      toast({ title: 'Resource deleted', description: 'The resource submission was removed.' });
    } catch (error) {
      toast({
        title: 'Failed to delete resource',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="flex flex-wrap justify-end gap-2">
      {!approved && (
        <Button size="sm" disabled={isMutating} onClick={() => void approve()}>
          {updateResource.isPending ? 'Approving…' : 'Approve'}
        </Button>
      )}
      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogTrigger asChild>
          <Button variant="outline" size="sm" disabled={isMutating}>
            <Trash2 className="mr-1 size-4" aria-hidden="true" /> Delete
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete resource submission?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the submission. An approved resource will also be removed
              from the live tournament views.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isMutating}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isMutating}
              onClick={event => {
                event.preventDefault();
                void remove();
              }}
            >
              {deleteResource.isPending ? 'Deleting…' : 'Delete submission'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
