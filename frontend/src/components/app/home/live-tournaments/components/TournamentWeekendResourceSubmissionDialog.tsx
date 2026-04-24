import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { useCreateTournamentWeekendResource } from '@/api/tournament-weekends';
import Flag from '@/components/app/global/Flag.tsx';
import { Button } from '@/components/ui/button.tsx';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Label } from '@/components/ui/label.tsx';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select.tsx';
import { useUser } from '@/hooks/useUser.ts';
import type { CountryCode } from '../../../../../../../server/db/lists.ts';
import type { LiveTournamentWeekendTournamentEntry } from '../liveTournamentTypes.ts';

function getInitialTournamentId(
  tournaments: LiveTournamentWeekendTournamentEntry[],
  preselectedTournamentId?: string,
) {
  if (
    preselectedTournamentId &&
    tournaments.some(entry => entry.tournament.id === preselectedTournamentId)
  ) {
    return preselectedTournamentId;
  }

  return tournaments[0]?.tournament.id ?? '';
}

export function TournamentWeekendResourceSubmissionDialog({
  open,
  onOpenChange,
  weekendId,
  tournaments,
  preselectedTournamentId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  weekendId: string;
  tournaments: LiveTournamentWeekendTournamentEntry[];
  preselectedTournamentId?: string;
}) {
  const user = useUser();
  const createResource = useCreateTournamentWeekendResource(weekendId);
  const [selectedTournamentId, setSelectedTournamentId] = useState(() =>
    getInitialTournamentId(tournaments, preselectedTournamentId),
  );
  const [streamUrl, setStreamUrl] = useState('');
  const [meleeId, setMeleeId] = useState('');
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setSelectedTournamentId(getInitialTournamentId(tournaments, preselectedTournamentId));
      setStreamUrl('');
      setMeleeId('');
      setSubmissionError(null);
      setSubmitted(false);
      setIsSubmitting(false);
      return;
    }

    setSelectedTournamentId(getInitialTournamentId(tournaments, preselectedTournamentId));
    setStreamUrl('');
    setMeleeId('');
    setSubmissionError(null);
    setSubmitted(false);
  }, [open, preselectedTournamentId]);

  const selectedTournament = useMemo(
    () => tournaments.find(entry => entry.tournament.id === selectedTournamentId) ?? null,
    [selectedTournamentId, tournaments],
  );

  const showMeleeInput = !selectedTournament?.tournament.meleeId;

  useEffect(() => {
    if (!showMeleeInput) {
      setMeleeId('');
    }
  }, [showMeleeInput]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!user || !selectedTournamentId) return;

    const trimmedStreamUrl = streamUrl.trim();
    const trimmedMeleeId = meleeId.trim();

    if (!trimmedStreamUrl && !trimmedMeleeId) {
      setSubmissionError('Enter a YouTube link, a Melee ID, or both.');
      return;
    }

    setSubmissionError(null);
    setIsSubmitting(true);

    try {
      if (trimmedStreamUrl) {
        await createResource.mutateAsync({
          tournamentId: selectedTournamentId,
          resourceType: 'stream',
          resourceUrl: trimmedStreamUrl,
        });
      }

      if (trimmedMeleeId && showMeleeInput) {
        await createResource.mutateAsync({
          tournamentId: selectedTournamentId,
          resourceType: 'melee',
          resourceUrl: trimmedMeleeId,
        });
      }

      setSubmitted(true);
      setStreamUrl('');
      setMeleeId('');
    } catch (error) {
      setSubmissionError(
        error instanceof Error ? error.message : 'Submission failed. Please try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[32rem]">
        <DialogHeader>
          <DialogTitle>Submit Stream or Melee ID</DialogTitle>
          <DialogDescription>
            Send a YouTube stream link or missing Melee ID for review by an admin.
          </DialogDescription>
        </DialogHeader>

        {!user ? (
          <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
            Sign in to submit stream links or Melee IDs for live tournaments.
          </div>
        ) : submitted ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-md border border-green-600/20 bg-green-600/10 px-4 py-8 text-center text-green-700 dark:text-green-400">
            <CheckCircle2 className="h-10 w-10" />
            <div className="space-y-1">
              <p className="font-semibold">Submission received</p>
              <p className="text-sm text-current/80">
                Your resource was sent for admin review.
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="weekend-resource-tournament">Tournament</Label>
              <Select value={selectedTournamentId} onValueChange={setSelectedTournamentId}>
                <SelectTrigger id="weekend-resource-tournament">
                  <SelectValue placeholder="Select a tournament" />
                </SelectTrigger>
                <SelectContent>
                  {tournaments.map(entry => {
                    const countryCode = entry.tournament.location as CountryCode | undefined;
                    return (
                      <SelectItem key={entry.tournament.id} value={entry.tournament.id}>
                        <div className="flex items-center gap-2">
                          {countryCode ? (
                            <Flag countryCode={countryCode} className="h-3 w-5 rounded-sm" />
                          ) : null}
                          <span className="truncate">{entry.tournament.name}</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="weekend-resource-stream">YouTube stream link</Label>
              <Input
                id="weekend-resource-stream"
                value={streamUrl}
                onChange={event => setStreamUrl(event.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                disabled={isSubmitting}
              />
            </div>

            {showMeleeInput ? (
              <div className="space-y-2">
                <Label htmlFor="weekend-resource-melee">Melee tournament ID</Label>
                <Input
                  id="weekend-resource-melee"
                  value={meleeId}
                  onChange={event => setMeleeId(event.target.value)}
                  placeholder="Paste a Melee ID or URL"
                  disabled={isSubmitting}
                />
              </div>
            ) : (
              <div className="rounded-md border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                This tournament already has a Melee ID.
              </div>
            )}

            {submissionError && (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {submissionError}
              </div>
            )}

            <div className="flex items-center justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || !selectedTournamentId}>
                {isSubmitting ? 'Submitting...' : 'Submit for Review'}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
