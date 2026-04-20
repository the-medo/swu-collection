import { type FormEvent, useState } from 'react';
import { useCreateTournamentWeekendResource } from '@/api/tournament-weekends';
import { useUser } from '@/hooks/useUser.ts';
import { Button } from '@/components/ui/button.tsx';
import { Input } from '@/components/ui/input.tsx';
import type { TournamentWeekendResourceType } from '../liveTournamentTypes.ts';

export function StreamSubmissionPrompt({
  weekendId,
  tournamentId,
}: {
  weekendId: string;
  tournamentId: string;
}) {
  const user = useUser();
  const [resourceUrl, setResourceUrl] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const createResource = useCreateTournamentWeekendResource(weekendId);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedUrl = resourceUrl.trim();
    if (!trimmedUrl) return;

    createResource.mutate(
      {
        tournamentId,
        resourceType: 'stream' satisfies TournamentWeekendResourceType,
        resourceUrl: trimmedUrl,
      },
      {
        onSuccess: () => {
          setResourceUrl('');
          setSubmitted(true);
        },
      },
    );
  };

  if (!user) {
    return (
      <p className="text-xs text-muted-foreground">
        Stream link missing. Sign in to submit a YouTube or Twitch link.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <Input
        value={resourceUrl}
        onChange={event => setResourceUrl(event.target.value)}
        placeholder="YouTube or Twitch stream"
        className="h-8 text-xs"
      />
      <div className="flex flex-wrap items-center gap-2">
        <Button size="xs" type="submit" disabled={createResource.isPending}>
          Submit stream
        </Button>
        {submitted && <span className="text-xs text-muted-foreground">Sent for approval</span>}
        {createResource.isError && (
          <span className="text-xs text-destructive">
            {createResource.error?.message ?? 'Stream link was not accepted'}
          </span>
        )}
      </div>
    </form>
  );
}
