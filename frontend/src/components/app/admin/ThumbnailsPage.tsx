import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { useGenerateDeckThumbnails } from '@/api/decks/useGenerateDeckThumbnails';
import { useGenerateTournamentThumbnails } from '@/api/tournaments/useGenerateTournamentThumbnails';
import { Input } from '@/components/ui/input';

export function ThumbnailsPage() {
  // Deck thumbnails state
  const [forceRegeneration, setForceRegeneration] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTournamentId, setSelectedTournamentId] = useState<string>('');

  // Tournament thumbnails state
  const [forceTournamentRegeneration, setForceTournamentRegeneration] = useState(false);
  const [tournamentError, setTournamentError] = useState<string | null>(null);
  const [selectedTournamentIdForTournament, setSelectedTournamentIdForTournament] =
    useState<string>('');

  // Deck thumbnails mutation
  const {
    mutate: generateThumbnails,
    data: result,
    isPending: isLoading,
    error: mutationError,
  } = useGenerateDeckThumbnails();

  // Tournament thumbnails mutation
  const {
    mutate: generateTournamentThumbnails,
    data: tournamentResult,
    isPending: isTournamentLoading,
    error: tournamentMutationError,
  } = useGenerateTournamentThumbnails();

  // Update error state when mutation error changes
  useEffect(() => {
    if (mutationError) {
      setError('message' in mutationError ? mutationError.message : 'An unknown error occurred');
    } else {
      setError(null);
    }
  }, [mutationError]);

  // Update tournament error state when tournament mutation error changes
  useEffect(() => {
    if (tournamentMutationError) {
      setTournamentError(
        'message' in tournamentMutationError
          ? tournamentMutationError.message
          : 'An unknown error occurred',
      );
    } else {
      setTournamentError(null);
    }
  }, [tournamentMutationError]);

  const handleGenerateThumbnails = () => {
    setError(null);
    generateThumbnails({
      force: forceRegeneration,
      tournament_id: selectedTournamentId || undefined, // Send undefined if empty string
    });
  };

  const handleGenerateTournamentThumbnails = () => {
    setTournamentError(null);
    generateTournamentThumbnails({
      force: forceTournamentRegeneration,
      tournament_id: selectedTournamentIdForTournament || undefined, // Send undefined if empty string
    });
  };

  const onChangeSelectedTournamentId = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedTournamentId(e.target.value);
  };

  const onChangeSelectedTournamentIdForTournament = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedTournamentIdForTournament(e.target.value);
  };

  return (
    <div className="space-y-8">
      {/* Deck Thumbnails Section */}
      <Card>
        <CardHeader>
          <CardTitle>Deck Thumbnails</CardTitle>
          <CardDescription>
            Generate thumbnails for decks. You can generate thumbnails for all decks or select a
            specific tournament. This process may take some time depending on the number of unique
            leader/base combinations.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="tournament">Tournament (optional)</Label>
              <Input
                id="tournament"
                value={selectedTournamentId}
                onChange={onChangeSelectedTournamentId}
                disabled={isLoading}
                placeholder="Enter tournament ID (leave empty for all decks)"
                className="w-full"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="force"
                checked={forceRegeneration}
                onCheckedChange={checked => setForceRegeneration(checked as boolean)}
                disabled={isLoading}
              />
              <Label htmlFor="force">
                Force regeneration (regenerate thumbnails even if they already exist)
              </Label>
            </div>
          </div>

          {error && (
            <Alert variant="destructive" className="mt-6 mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {isLoading && (
            <div className="space-y-4 mt-6">
              <div className="flex items-center space-x-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Generating thumbnails...</span>
              </div>
            </div>
          )}

          {result && (
            <div className="space-y-4 mt-6">
              <Alert variant={result.errors > 0 ? 'warning' : 'default'}>
                {result.errors > 0 ? (
                  <AlertCircle className="h-4 w-4" />
                ) : (
                  <CheckCircle className="h-4 w-4" />
                )}
                <AlertTitle>Generation Complete</AlertTitle>
                <AlertDescription>
                  Successfully generated {result.success} thumbnails
                  {result.tournamentId
                    ? ` for tournament ${result.tournamentId}`
                    : ' for all decks'}
                  .{result.errors > 0 && ` Failed to generate ${result.errors} thumbnails.`}
                </AlertDescription>
              </Alert>

              {result.errors > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium mb-2">Error Details:</h4>
                  <ul className="text-sm space-y-1">
                    {result.errorDetails.map((error, index) => (
                      <li key={index} className="text-destructive">
                        Leader/Base combination {error.leaderBaseKey}: {error.error}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </CardContent>
        <CardFooter>
          <Button onClick={handleGenerateThumbnails} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              'Generate Thumbnails'
            )}
          </Button>
        </CardFooter>
      </Card>

      {/* Tournament Thumbnails Section */}
      <Card>
        <CardHeader>
          <CardTitle>Tournament Thumbnails</CardTitle>
          <CardDescription>
            Generate thumbnails for tournaments. You can generate thumbnails for all tournaments or
            select a specific tournament. This process may take some time depending on the number of
            tournaments.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="tournament-for-tournament">Tournament (optional)</Label>
              <Input
                id="tournament-for-tournament"
                value={selectedTournamentIdForTournament}
                onChange={onChangeSelectedTournamentIdForTournament}
                disabled={isTournamentLoading}
                placeholder="Enter tournament ID (leave empty for all tournaments)"
                className="w-full"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="force-tournament"
                checked={forceTournamentRegeneration}
                onCheckedChange={checked => setForceTournamentRegeneration(checked as boolean)}
                disabled={isTournamentLoading}
              />
              <Label htmlFor="force-tournament">
                Force regeneration (regenerate thumbnails even if they already exist)
              </Label>
            </div>
          </div>

          {tournamentError && (
            <Alert variant="destructive" className="mt-6 mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{tournamentError}</AlertDescription>
            </Alert>
          )}

          {isTournamentLoading && (
            <div className="space-y-4 mt-6">
              <div className="flex items-center space-x-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Generating tournament thumbnails...</span>
              </div>
            </div>
          )}

          {tournamentResult && (
            <div className="space-y-4 mt-6">
              <Alert variant={tournamentResult.errors > 0 ? 'warning' : 'default'}>
                {tournamentResult.errors > 0 ? (
                  <AlertCircle className="h-4 w-4" />
                ) : (
                  <CheckCircle className="h-4 w-4" />
                )}
                <AlertTitle>Generation Complete</AlertTitle>
                <AlertDescription>
                  Successfully generated {tournamentResult.success} thumbnails
                  {tournamentResult.tournamentId
                    ? ` for tournament ${tournamentResult.tournamentId}`
                    : ' for all tournaments'}
                  .
                  {tournamentResult.errors > 0 &&
                    ` Failed to generate ${tournamentResult.errors} thumbnails.`}
                </AlertDescription>
              </Alert>

              {tournamentResult.errors > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium mb-2">Error Details:</h4>
                  <ul className="text-sm space-y-1">
                    {tournamentResult.errorDetails.map((error, index) => (
                      <li key={index} className="text-destructive">
                        Tournament {error.tournamentId}: {error.error}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </CardContent>
        <CardFooter>
          <Button onClick={handleGenerateTournamentThumbnails} disabled={isTournamentLoading}>
            {isTournamentLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              'Generate Tournament Thumbnails'
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
