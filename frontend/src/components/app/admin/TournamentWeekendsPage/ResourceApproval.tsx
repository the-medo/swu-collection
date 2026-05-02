import { useGetTournamentWeekendResources } from '@/api/tournament-weekends';
import { TournamentWeekendResourceTable } from '@/components/app/home/live-tournaments/components';

export function ResourceApproval({
  weekendId,
}: {
  weekendId: string;
}) {
  const { data, isLoading } = useGetTournamentWeekendResources(weekendId, 'all');
  const resources = data?.data ?? [];

  return (
    <section className="space-y-3 rounded-md border bg-background p-3">
      <div>
        <h3 className="text-sm font-medium">Resources</h3>
        <p className="text-xs text-muted-foreground">
          Review weekend stream links and Melee IDs submitted by users.
        </p>
      </div>
      <TournamentWeekendResourceTable
        weekendId={weekendId}
        resources={resources}
        isLoading={isLoading}
        isAdmin
      />
    </section>
  );
}
