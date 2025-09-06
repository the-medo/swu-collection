import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { useRunDailySnapshot } from '@/api/admin/useRunDailySnapshot';

export const RunDailySnapshotAction: React.FC = () => {
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [snapshotDate, setSnapshotDate] = useState<string>('');
  const { toast } = useToast();
  const runDailySnapshot = useRunDailySnapshot();

  const handleRun = async () => {
    if (!isConfirmed) {
      toast({
        title: 'Confirmation required',
        description: 'Please check the confirmation box before proceeding.',
        variant: 'destructive',
      });
      return;
    }
    try {
      const res = await runDailySnapshot.mutateAsync({ date: snapshotDate || undefined });
      const okCount = res.data.sections.filter(s => s.ok).length;
      toast({
        title: 'Daily snapshot completed',
        description: `Date: ${res.data.date}. Sections OK: ${okCount}/${res.data.sections.length}.`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Run Daily Snapshot</h2>
      <p className="text-muted-foreground">
        Trigger the daily snapshot generation for a specific date. If no date is selected, today will be used.
      </p>

      <div className="flex items-center space-x-4 mt-2">
        <div className="flex flex-col">
          <label htmlFor="snapshot-date" className="text-sm font-medium mb-1">
            Date (optional)
          </label>
          <input
            id="snapshot-date"
            type="date"
            className="border rounded px-3 py-2"
            value={snapshotDate}
            onChange={(e) => setSnapshotDate(e.target.value)}
          />
        </div>

        <div className="flex items-center space-x-2 mt-6">
          <Checkbox
            id="confirm-snapshot"
            checked={isConfirmed}
            onCheckedChange={checked => setIsConfirmed(checked === true)}
          />
          <label
            htmlFor="confirm-snapshot"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Are you sure?
          </label>
        </div>
      </div>

      <Button onClick={handleRun} disabled={runDailySnapshot.isPending} className="mt-4">
        {runDailySnapshot.isPending ? 'Running...' : 'Run snapshot'}
      </Button>
    </div>
  );
};

export default RunDailySnapshotAction;
