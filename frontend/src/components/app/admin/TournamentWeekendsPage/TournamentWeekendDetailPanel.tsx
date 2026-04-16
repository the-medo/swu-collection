import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useGetTournamentWeekend } from '@/api/tournament-weekends';
import { ResourceApproval } from './ResourceApproval.tsx';
import { TournamentWeekendActions } from './TournamentWeekendActions.tsx';
import { TournamentWeekendGroupManager } from './TournamentWeekendGroupManager.tsx';
import { TournamentWeekendSettings } from './TournamentWeekendSettings.tsx';
import { WeekendTournamentsTable } from './WeekendTournamentsTable.tsx';
import type { TournamentWeekend } from '../../../../../../server/db/schema/tournament_weekend.ts';
import type { TournamentWeekendCheckResponse } from '../../../../../../types/TournamentWeekend.ts';

export function TournamentWeekendDetailPanel({ weekend }: { weekend: TournamentWeekend }) {
  const [checkData, setCheckData] = useState<TournamentWeekendCheckResponse | undefined>();
  const { data, isLoading, isError, error } = useGetTournamentWeekend(weekend.id);
  const detail = data?.data;

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading weekend detail...
      </div>
    );
  }

  if (isError || !detail) {
    return (
      <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm">
        {error?.message ?? 'Failed to load tournament weekend detail.'}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <TournamentWeekendSettings weekend={detail.weekend} detail={detail} />
      <TournamentWeekendActions
        weekend={detail.weekend}
        checkData={checkData}
        onCheckData={setCheckData}
      />
      <TournamentWeekendGroupManager weekendId={detail.weekend.id} detail={detail} />
      <WeekendTournamentsTable tournaments={detail.tournaments} />
      <ResourceApproval weekendId={detail.weekend.id} detail={detail} />
    </div>
  );
}
