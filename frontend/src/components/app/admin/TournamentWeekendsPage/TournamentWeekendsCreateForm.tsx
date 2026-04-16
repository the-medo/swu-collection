import { FormEvent, useState } from 'react';
import { Loader2, Plus } from 'lucide-react';
import { useCreateTournamentWeekend } from '@/api/tournament-weekends';
import { Button } from '@/components/ui/button.tsx';
import { DatePicker } from '@/components/ui/date-picker.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Label } from '@/components/ui/label.tsx';
import { toast } from '@/hooks/use-toast.ts';

export function TournamentWeekendsCreateForm() {
  const [name, setName] = useState('');
  const [date, setDate] = useState<string | undefined>();
  const createWeekend = useCreateTournamentWeekend();

  const submit = async (event: FormEvent) => {
    event.preventDefault();

    if (!name.trim() || !date) {
      toast({
        title: 'Missing weekend data',
        description: 'Name and Saturday date are required.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await createWeekend.mutateAsync({ name: name.trim(), date });
      setName('');
      setDate(undefined);
      toast({
        title: 'Weekend created',
        description: 'Tournament weekend was created and synced.',
      });
    } catch (error) {
      toast({
        title: 'Failed to create weekend',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <form onSubmit={submit} className="rounded-md border p-4">
      <div className="grid gap-4 md:grid-cols-[1fr_220px_auto] md:items-end">
        <div className="space-y-2">
          <Label htmlFor="weekend-name">Name</Label>
          <Input
            id="weekend-name"
            value={name}
            onChange={event => setName(event.target.value)}
            placeholder="PQ Week 1"
          />
        </div>
        <div className="space-y-2">
          <Label>Saturday date</Label>
          <DatePicker date={date} onDateChange={setDate} placeholder="Pick Saturday" />
        </div>
        <Button type="submit" disabled={createWeekend.isPending}>
          {createWeekend.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Plus className="mr-2 h-4 w-4" />
          )}
          Create
        </Button>
      </div>
    </form>
  );
}
