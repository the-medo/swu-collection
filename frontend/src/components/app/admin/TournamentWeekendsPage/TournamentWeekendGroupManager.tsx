import { useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import MetaSelector from '@/components/app/global/MetaSelector/MetaSelector.tsx';
import { useGetTournamentGroups } from '@/api/tournament-groups';
import {
  useAddTournamentWeekendGroup,
  useDeleteTournamentWeekendGroup,
} from '@/api/tournament-weekends';
import { Button } from '@/components/ui/button.tsx';
import { Label } from '@/components/ui/label.tsx';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select.tsx';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table.tsx';
import { toast } from '@/hooks/use-toast.ts';
import { formatData } from '../../../../../../types/Format.ts';
import type { LiveTournamentWeekendDetail } from '../../../../../../types/TournamentWeekend.ts';

export function TournamentWeekendGroupManager({
  weekendId,
  detail,
}: {
  weekendId: string;
  detail: LiveTournamentWeekendDetail;
}) {
  const [groupId, setGroupId] = useState<string>('empty');
  const [formatId, setFormatId] = useState<string>('auto');
  const [metaId, setMetaId] = useState<number | null>(null);
  const addGroup = useAddTournamentWeekendGroup(weekendId);
  const deleteGroup = useDeleteTournamentWeekendGroup(weekendId);
  const { data: groupsData, isLoading } = useGetTournamentGroups({
    pageSize: 200,
    sort: 'position',
    order: 'asc',
  });

  const groups = useMemo(() => groupsData?.pages.flatMap(page => page.data) ?? [], [groupsData]);

  const add = async () => {
    if (groupId === 'empty') {
      toast({
        title: 'Select a tournament group',
        description: 'Pick a group before adding it to the weekend.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await addGroup.mutateAsync({
        tournamentGroupId: groupId,
        formatId: formatId === 'auto' ? undefined : Number(formatId),
        metaId,
      });
      setGroupId('empty');
      setFormatId('auto');
      setMetaId(null);
      toast({
        title: 'Tournament group added',
        description: 'The group is now attached to this weekend.',
      });
    } catch (error) {
      toast({
        title: 'Failed to add tournament group',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    }
  };

  const remove = async (tournamentGroupId: string) => {
    try {
      await deleteGroup.mutateAsync(tournamentGroupId);
      toast({
        title: 'Tournament group removed',
        description: 'The group was removed from this weekend.',
      });
    } catch (error) {
      toast({
        title: 'Failed to remove tournament group',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <section className="space-y-3 rounded-md border bg-background p-3">
      <div>
        <h3 className="text-sm font-medium">Tournament groups</h3>
        <p className="text-xs text-muted-foreground">
          Attached groups provide the weekend meta charts later.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-[1fr_180px_1fr_auto] md:items-end">
        <div className="space-y-2">
          <Label>Group</Label>
          <Select value={groupId} onValueChange={setGroupId} disabled={isLoading}>
            <SelectTrigger>
              <SelectValue placeholder="Select group" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="empty">- Select group -</SelectItem>
              {groups.map(group => (
                <SelectItem key={group.group.id} value={group.group.id}>
                  {group.group.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Format</Label>
          <Select value={formatId} onValueChange={setFormatId}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">Auto</SelectItem>
              {formatData.map(format => (
                <SelectItem key={format.id} value={format.id.toString()}>
                  {format.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Meta</Label>
          <MetaSelector value={metaId} onChange={setMetaId} emptyOption={true} />
        </div>
        <Button onClick={add} disabled={addGroup.isPending}>
          <Plus className="mr-2 h-4 w-4" />
          Add
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Group</TableHead>
            <TableHead>Format</TableHead>
            <TableHead>Meta</TableHead>
            <TableHead className="w-20"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {detail.tournamentGroups.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="h-16 text-center text-muted-foreground">
                No groups attached.
              </TableCell>
            </TableRow>
          ) : (
            detail.tournamentGroups.map(group => (
              <TableRow key={group.weekendTournamentGroup.tournamentGroupId}>
                <TableCell>{group.tournamentGroup.name}</TableCell>
                <TableCell>{group.format?.name ?? '-'}</TableCell>
                <TableCell>{group.meta?.name ?? '-'}</TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={deleteGroup.isPending}
                    onClick={() => remove(group.tournamentGroup.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </section>
  );
}
