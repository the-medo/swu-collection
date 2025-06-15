import { useMemo, useState } from 'react';
import { DataTable } from '@/components/ui/data-table.tsx';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import MetaSelector from '@/components/app/global/MetaSelector/MetaSelector';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from '@/hooks/use-toast.ts';
import { useTournamentGroupsTableColumns } from './useTournamentGroupsTableColumns';
import {
  useGetTournamentGroups,
  useDeleteTournamentGroup,
  usePostTournamentGroupRecompute,
} from '@/api/tournament-groups';
import { TournamentGroupForm } from './TournamentGroupForm';
import { TournamentGroupDetail } from './TournamentGroupDetail';
import { TournamentGroupWithMeta } from '../../../../../types/TournamentGroup.ts';

export function TournamentGroupsPage() {
  const [selectedMetaId, setSelectedMetaId] = useState<number | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<TournamentGroupWithMeta | null>(null);

  console.log('Here.');

  const params = useMemo(
    () => ({
      meta: selectedMetaId || undefined,
    }),
    [selectedMetaId],
  );

  // Fetch tournament groups filtered by meta
  const { data } = useGetTournamentGroups(params);

  const deleteTournamentGroup = useDeleteTournamentGroup();
  const recomputeTournamentGroup = usePostTournamentGroupRecompute();

  const handleEdit = (group: TournamentGroupWithMeta) => {
    setSelectedGroup(group);
    setEditDialogOpen(true);
  };

  const handleDelete = (group: TournamentGroupWithMeta) => {
    setSelectedGroup(group);
    setDeleteDialogOpen(true);
  };

  const handleManageTournaments = (group: TournamentGroupWithMeta) => {
    setSelectedGroup(group);
    setDetailDialogOpen(true);
  };

  const handleRecompute = async (group: TournamentGroupWithMeta) => {
    try {
      await recomputeTournamentGroup.mutateAsync(group.group.id);
      toast({
        title: 'Statistics recomputed',
        description: `Statistics for "${group.group.name}" have been recomputed.`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to recompute statistics. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const confirmDelete = async () => {
    if (!selectedGroup) return;

    try {
      await deleteTournamentGroup.mutateAsync(selectedGroup.group.id);
      toast({
        title: 'Tournament group deleted',
        description: `Tournament group "${selectedGroup.group.name}" has been deleted.`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete tournament group. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setDeleteDialogOpen(false);
      setSelectedGroup(null);
    }
  };

  const columns = useTournamentGroupsTableColumns({
    onEdit: handleEdit,
    onDelete: handleDelete,
    onManageTournaments: handleManageTournaments,
    onRecompute: handleRecompute,
  });

  const groups = useMemo(() => data?.pages.map(p => p.data).flat() ?? [], [data]);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Tournament Groups</h2>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Group
        </Button>
      </div>

      <div className="w-full max-w-sm">
        <label className="block text-sm font-medium mb-1">Filter by Meta</label>
        <MetaSelector value={selectedMetaId} onChange={setSelectedMetaId} emptyOption={true} />
      </div>

      <DataTable columns={columns} data={groups} />

      {/* Create Tournament Group Dialog */}
      <TournamentGroupForm
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={() => setCreateDialogOpen(false)}
        metaId={selectedMetaId}
      />

      {/* Edit Tournament Group Dialog */}
      {selectedGroup && (
        <TournamentGroupForm
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          initialData={selectedGroup.group}
          onSuccess={() => {
            setEditDialogOpen(false);
            setSelectedGroup(null);
          }}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the tournament group "{selectedGroup?.group.name}". This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Tournament Group Detail Dialog */}
      {selectedGroup && (
        <TournamentGroupDetail
          group={selectedGroup}
          open={detailDialogOpen}
          onOpenChange={setDetailDialogOpen}
        />
      )}
    </div>
  );
}
