import { FormEvent, useState } from 'react';
import { useUpdateTournamentWeekend } from '@/api/tournament-weekends';
import { Button } from '@/components/ui/button.tsx';
import { DatePicker } from '@/components/ui/date-picker.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Label } from '@/components/ui/label.tsx';
import { toast } from '@/hooks/use-toast.ts';
import type { TournamentWeekend } from '../../../../../../server/db/schema/tournament_weekend.ts';
import type { LiveTournamentWeekendDetail } from '../../../../../../types/TournamentWeekend.ts';

export function TournamentWeekendSettings({
  weekend,
  detail,
}: {
  weekend: TournamentWeekend;
  detail?: LiveTournamentWeekendDetail;
}) {
  const [name, setName] = useState(weekend.name);
  const [date, setDate] = useState<string | undefined>(weekend.date);
  const updateWeekend = useUpdateTournamentWeekend();

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim() || !date) return;

    try {
      await updateWeekend.mutateAsync({
        id: weekend.id,
        data: { name: name.trim(), date },
      });
      toast({
        title: 'Weekend updated',
        description: 'Weekend settings were saved.',
      });
    } catch (error) {
      toast({
        title: 'Failed to update weekend',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <form onSubmit={save} className="rounded-md border bg-background p-3">
      <div className="mb-3 text-sm font-medium">Weekend settings</div>
      <div className="grid gap-3 md:grid-cols-[1fr_220px_auto] md:items-end">
        <div className="space-y-2">
          <Label htmlFor={`weekend-name-${weekend.id}`}>Name</Label>
          <Input
            id={`weekend-name-${weekend.id}`}
            value={name}
            onChange={event => setName(event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Saturday date</Label>
          <DatePicker date={date} onDateChange={setDate} />
        </div>
        <Button type="submit" disabled={updateWeekend.isPending}>
          Save
        </Button>
      </div>
      {detail && (
        <div className="mt-3 flex flex-wrap gap-1 text-xs text-muted-foreground">
          <span>{detail.tournaments.length} tournaments</span>
          <span>-</span>
          <span>{detail.tournamentGroups.length} tournament groups</span>
          <span>-</span>
          <span>{detail.resources.length} resources</span>
        </div>
      )}
    </form>
  );
}
