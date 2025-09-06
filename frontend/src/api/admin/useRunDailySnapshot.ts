import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import type { ErrorWithStatus } from '../../../../types/ErrorWithStatus.ts';

export interface DailySnapshotSectionSummary {
  name: string;
  ok: boolean;
  error?: string;
}

export interface RunDailySnapshotResponse {
  message: string;
  data: {
    date: string;
    tournamentGroupId: string | null;
    sections: DailySnapshotSectionSummary[];
  };
}

export interface RunDailySnapshotVariables {
  date?: string; // YYYY-MM-DD optional
}

export const useRunDailySnapshot = () => {
  return useMutation<RunDailySnapshotResponse, ErrorWithStatus, RunDailySnapshotVariables>({
    mutationFn: async (vars?: RunDailySnapshotVariables) => {
      const response = await api.admin['special-actions']['daily-snapshot'].$post({
        json: vars && vars.date ? { date: vars.date } : undefined,
      });

      if (!response.ok) {
        if (response.status === 401) {
          const error: ErrorWithStatus = new Error('Unauthorized');
          error.status = 401;
          throw error;
        }
        if (response.status === 403) {
          const error: ErrorWithStatus = new Error('Forbidden');
          error.status = 403;
          throw error;
        }
        throw new Error('Something went wrong');
      }

      const data = await response.json();
      return data as RunDailySnapshotResponse;
    },
  });
};
