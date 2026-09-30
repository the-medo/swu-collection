import { Star, X } from 'lucide-react';
import { Button } from '@/components/ui/button.tsx';
import { ButtonGroup } from '@/components/ui/button-group.tsx';
import SignInWrapper from '@/components/app/auth/SignInWrapper.tsx';
import { useUser } from '@/hooks/useUser.ts';
import { useSavedTournaments, useSaveTournament } from '@/api/tournaments/useSavedTournaments.ts';
import { tournamentSaveStatuses } from '../../../../../types/UserTournamentSave.ts';

export function TournamentSaveControls({ tournamentId }: { tournamentId: string }) {
  const user = useUser();
  return (
    <SignInWrapper text="Save tournament">
      {user && <SignedInSaveControls key={user.id} userId={user.id} tournamentId={tournamentId} />}
    </SignInWrapper>
  );
}

function SignedInSaveControls({ userId, tournamentId }: { userId: string; tournamentId: string }) {
  const query = useSavedTournaments();
  const mutation = useSaveTournament(tournamentId);
  const saved = query.data?.find(row => row.tournamentId === tournamentId);
  if (query.isPending)
    return (
      <p role="status" className="text-xs text-muted-foreground">
        Loading your saved tournaments…
      </p>
    );
  if (!query.data)
    return (
      <div role="alert" className="text-xs">
        Could not load your saved tournaments.{' '}
        <Button variant="link" size="sm" onClick={() => void query.refetch()}>
          Retry
        </Button>
      </div>
    );
  return (
    <div className="mt-2 space-y-1">
      <div className="flex items-center gap-1">
        <ButtonGroup aria-label="Tournament save status">
          {tournamentSaveStatuses.map(status => (
            <Button
              key={status}
              type="button"
              size="sm"
              variant={saved?.status === status ? 'default' : 'outline'}
              className="h-8 gap-1 px-2 text-xs"
              aria-pressed={saved?.status === status}
              disabled={mutation.isPending}
              onClick={() => {
                if (saved?.status !== status) mutation.mutate({ userId, status });
              }}
            >
              {status === 'saved' && <Star className="size-3.5" />}
              {status === 'saved'
                ? saved?.status === 'saved'
                  ? 'Saved'
                  : 'Save'
                : status === 'maybe'
                  ? 'Maybe'
                  : 'Going'}
            </Button>
          ))}
        </ButtonGroup>
        {saved && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8"
            aria-label="Remove from your tournaments"
            title="Remove from your tournaments"
            disabled={mutation.isPending}
            onClick={() => mutation.mutate({ userId, status: null })}
          >
            <X className="size-4" />
          </Button>
        )}
      </div>
      {mutation.error && (
        <p role="alert" className="text-xs text-destructive">
          {mutation.error.message}
        </p>
      )}
    </div>
  );
}
