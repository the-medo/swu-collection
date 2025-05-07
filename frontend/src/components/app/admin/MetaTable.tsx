import { useState } from 'react';
import { DataTable } from '@/components/ui/data-table.tsx';
import { useMetaTableColumns } from './useMetaTableColumns';
import { useGetMetas, MetaData } from '@/api/meta/useGetMetas';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
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
import { useDeleteMeta } from '@/api/meta/useDeleteMeta';
import { MetaForm } from './MetaForm';
import { toast } from '@/hooks/use-toast.ts';

export function MetaTable() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedMeta, setSelectedMeta] = useState<MetaData['meta'] | null>(null);

  const { data, isLoading } = useGetMetas();
  const deleteMeta = useDeleteMeta();

  const handleEdit = (meta: MetaData['meta']) => {
    setSelectedMeta(meta);
    setEditDialogOpen(true);
  };

  const handleDelete = (meta: MetaData['meta']) => {
    setSelectedMeta(meta);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedMeta) return;

    try {
      await deleteMeta.mutateAsync(selectedMeta.id);
      toast({
        title: 'Meta deleted',
        description: `Meta "${selectedMeta.name}" has been deleted.`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete meta. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setDeleteDialogOpen(false);
      setSelectedMeta(null);
    }
  };

  const columns = useMetaTableColumns({
    onEdit: handleEdit,
    onDelete: handleDelete,
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Metas</h2>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Meta
        </Button>
      </div>

      <DataTable columns={columns} data={data?.data || []} loading={isLoading} />

      {/* Create Meta Dialog */}
      <MetaForm
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={() => setCreateDialogOpen(false)}
      />

      {/* Edit Meta Dialog */}
      {selectedMeta && (
        <MetaForm
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          initialData={selectedMeta}
          onSuccess={() => {
            setEditDialogOpen(false);
            setSelectedMeta(null);
          }}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the meta "{selectedMeta?.name}". This action cannot be
              undone.
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
    </div>
  );
}
