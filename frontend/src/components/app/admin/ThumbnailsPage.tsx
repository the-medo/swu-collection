import { useState, useEffect, useMemo } from 'react';
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
import { useGetTournaments } from '@/api/tournaments/useGetTournaments';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function ThumbnailsPage() {
  const [forceRegeneration, setForceRegeneration] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTournamentId, setSelectedTournamentId] = useState<string>('');

  const {
    mutate: generateThumbnails,
    data: result,
    isPending: isLoading,
    error: mutationError,
  } = useGenerateDeckThumbnails();

  // Fetch tournaments
  const { data, isLoading: isLoadingTournaments, error: tournamentsError } = useGetTournaments();

  // Update error state when mutation error changes
  useEffect(() => {
    if (mutationError) {
      setError('message' in mutationError ? mutationError.message : 'An unknown error occurred');
    } else {
      setError(null);
    }
  }, [mutationError]);

  const tournaments = useMemo(() => {
    if (!data) return [];
    return data.pages.flatMap(page => page.data || []);
  }, [data]);

  const handleGenerateThumbnails = () => {
    setError(null);
    generateThumbnails({
      force: forceRegeneration,
      tournament_id: selectedTournamentId || undefined, // Send undefined if empty string
    });
  };

  const onChangeSelectedTournamentId = (value: string) => {
    setSelectedTournamentId(value === 'empty' ? '' : value);
  };

  return (
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
            <Select
              value={selectedTournamentId}
              onValueChange={onChangeSelectedTournamentId}
              disabled={isLoading}
            >
              <SelectTrigger id="tournament" className="w-full">
                <SelectValue placeholder="All decks (no specific tournament)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="empty">All decks (no specific tournament)</SelectItem>
                {tournaments.map(({ tournament }) => (
                  <SelectItem key={tournament.id} value={tournament.id}>
                    {tournament.name} ({new Date(tournament.date).toLocaleDateString()})
                  </SelectItem>
                ))}
                {isLoadingTournaments && (
                  <SelectItem value="loading" disabled>
                    Loading tournaments...
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
            {tournamentsError && (
              <p className="text-sm text-destructive">Error loading tournaments</p>
            )}
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
                {result.tournamentId ? ` for tournament ${result.tournamentId}` : ' for all decks'}.
                {result.errors > 0 && ` Failed to generate ${result.errors} thumbnails.`}
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
  );
}
