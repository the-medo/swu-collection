import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  AddTrainingDeck,
  TrainingRuns,
  TrainingDeckInspection,
} from '../../../../shared/types/crossfire-training-roster.ts';
import type {
  TrainingHistoryPage,
  TrainingStatus,
  TrainingRun,
} from '../../../../shared/types/crossfire-training.ts';

async function read<T>(endpoint: string, signal: AbortSignal): Promise<T> {
  // This local Vite endpoint intentionally lives outside the production Hono API.
  const response = await fetch(`/__crossfire-training/${endpoint}`, { signal, cache: 'no-store' });
  if (!response.ok)
    throw new Error('Unable to read training reports. Automatic refresh will retry.');
  return response.json();
}
export function useTrainingRuns() {
  return useQuery({
    queryKey: ['crossfire-training', 'runs'],
    queryFn: ({ signal }) => read<TrainingRuns>('runs', signal),
    staleTime: 5000,
  });
}
async function write<T>(endpoint: string, body: unknown, token?: string): Promise<T> {
  if (!token) throw new Error('Refresh the dashboard before adding a deck.');
  const response = await fetch(`/__crossfire-training/decks/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Crossfire-Training-Token': token },
    body: JSON.stringify(body),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message ?? 'Could not prepare the training deck.');
  return result;
}
export function useInspectTrainingDeck(token?: string) {
  return useMutation({
    mutationFn: (deckId: string) => write<TrainingDeckInspection>('inspect', { deckId }, token),
  });
}
export function useAddTrainingDeck(token?: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: AddTrainingDeck) =>
      write<{ run: string; revision: string }>('add', input, token),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ['crossfire-training'] });
    },
  });
}

export function useTrainingDashboard(run: TrainingRun) {
  const status = useQuery({
    queryKey: ['crossfire-training', 'status', run],
    queryFn: ({ signal }) => read<TrainingStatus>(`status?run=${run}`, signal),
    refetchInterval: 5000,
    staleTime: 3000,
    retry: 1,
  });
  const history = useInfiniteQuery({
    queryKey: ['crossfire-training', 'history', run],
    initialPageParam: null as number | null,
    queryFn: ({ pageParam, signal }) =>
      read<TrainingHistoryPage>(
        `history?run=${run}${pageParam === null ? '' : `&before=${pageParam}`}`,
        signal,
      ),
    getNextPageParam: page => page.nextBefore ?? undefined,
    refetchInterval: 5000,
    staleTime: 3000,
    retry: 1,
  });
  return { status, history };
}
