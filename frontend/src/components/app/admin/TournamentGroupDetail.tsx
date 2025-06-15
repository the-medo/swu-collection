import { useState } from 'react';
import { DataTable } from '@/components/ui/data-table.tsx';
import { Button } from '@/components/ui/button';
import { Plus, ArrowLeft } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
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
import {
  useGetTournamentGroupTournaments,
  useDeleteTournamentGroupTournament,
  usePostTournamentGroupTournament,
  usePutTournamentGroupTournament,
} from '@/api/tournament-groups';
import { useTournamentGroupDetailColumns } from './useTournamentGroupDetailColumns';
import { TournamentSelector } from './TournamentSelector';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  TournamentGroupTournament,
  TournamentGroupWithMeta,
} from '../../../../../types/TournamentGroup';

interface TournamentGroupDetailProps {
  group: TournamentGroupWithMeta;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TournamentGroupDetail({ group, open, onOpenChange }: TournamentGroupDetailProps) {
  const [addTournamentDialogOpen, setAddTournamentDialogOpen] = useState(false);
  const [removeTournamentDialogOpen, setRemoveTournamentDialogOpen] = useState(false);
  const [selectedTournament, setSelectedTournament] = useState<TournamentGroupTournament | null>(
    null,
  );
  const [newTournamentId, setNewTournamentId] = useState<string | null>(null);
  const [newPosition, setNewPosition] = useState<number>(0);

  // Fetch tournaments in the group
  const { data, isLoading } = useGetTournamentGroupTournaments(group.group.id);

  const addTournament = usePostTournamentGroupTournament(group.group.id);
  const updateTournamentPosition = usePutTournamentGroupTournament(group.group.id);
  const removeTournament = useDeleteTournamentGroupTournament(group.group.id);

  const handleRemoveTournament = (tournament: TournamentGroupTournament) => {
    setSelectedTournament(tournament);
    setRemoveTournamentDialogOpen(true);
  };

  const handleUpdatePosition = async (
    tournament: TournamentGroupTournament,
    newPosition: number,
  ) => {
    try {
      await updateTournamentPosition.mutateAsync({
        tournamentId: tournament.tournament.id,
        position: newPosition,
      });
      toast({
        title: 'Position updated',
        description: 'Tournament position has been updated.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update tournament position. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const confirmRemoveTournament = async () => {
    if (!selectedTournament) return;

    try {
      await removeTournament.mutateAsync(selectedTournament.tournament.id);
      toast({
        title: 'Tournament removed',
        description: `Tournament "${selectedTournament.tournament.name}" has been removed from the group.`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to remove tournament from group. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setRemoveTournamentDialogOpen(false);
      setSelectedTournament(null);
    }
  };

  const handleAddTournament = async () => {
    if (!newTournamentId) {
      toast({
        title: 'Error',
        description: 'Please select a tournament to add.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await addTournament.mutateAsync({
        tournamentId: newTournamentId,
        position: newPosition,
      });
      toast({
        title: 'Tournament added',
        description: 'Tournament has been added to the group.',
      });
      setAddTournamentDialogOpen(false);
      setNewTournamentId(null);
      setNewPosition(0);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to add tournament to group. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const columns = useTournamentGroupDetailColumns({
    onUpdatePosition: handleUpdatePosition,
    onRemove: handleRemoveTournament,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="h-8 w-8"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            Manage Tournaments in {group.group.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-medium">Tournaments</h3>
              <p className="text-sm text-muted-foreground">
                {data?.data.length || 0} tournaments in this group
              </p>
            </div>
            <Button onClick={() => setAddTournamentDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Tournament
            </Button>
          </div>

          <DataTable columns={columns} data={data?.data || []} loading={isLoading} />
        </div>
      </DialogContent>

      {/* Add Tournament Dialog */}
      <Dialog open={addTournamentDialogOpen} onOpenChange={setAddTournamentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Tournament to Group</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tournament">Tournament</Label>
              <TournamentSelector
                value={newTournamentId}
                onChange={setNewTournamentId}
                metaId={group.meta?.id}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="position">Position</Label>
              <Input
                id="position"
                type="number"
                value={newPosition}
                onChange={e => setNewPosition(parseInt(e.target.value) || 0)}
                min={0}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddTournamentDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddTournament}
              disabled={!newTournamentId || addTournament.isPending}
            >
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Tournament Confirmation Dialog */}
      <AlertDialog open={removeTournamentDialogOpen} onOpenChange={setRemoveTournamentDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the tournament "{selectedTournament?.tournament.name}" from the
              group. The tournament itself will not be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmRemoveTournament}
              className="bg-destructive text-destructive-foreground"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
