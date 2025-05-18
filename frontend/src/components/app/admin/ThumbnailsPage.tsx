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

export function ThumbnailsPage() {
  const [forceRegeneration, setForceRegeneration] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    mutate: generateThumbnails,
    data: result,
    isPending: isLoading,
    error: mutationError,
  } = useGenerateDeckThumbnails();

  // Update error state when mutation error changes
  useEffect(() => {
    if (mutationError) {
      setError(
        mutationError instanceof Error ? mutationError.message : 'An unknown error occurred',
      );
    } else {
      setError(null);
    }
  }, [mutationError]);

  const handleGenerateThumbnails = () => {
    setError(null);
    generateThumbnails({ force: forceRegeneration });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Deck Thumbnails</CardTitle>
        <CardDescription>
          Generate thumbnails for all decks. This process may take some time depending on the number
          of unique leader/base combinations.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center space-x-2 mb-6">
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

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {isLoading && (
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Generating thumbnails...</span>
            </div>
          </div>
        )}

        {result && (
          <div className="space-y-4">
            <Alert variant={result.errors > 0 ? 'warning' : 'default'}>
              {result.errors > 0 ? (
                <AlertCircle className="h-4 w-4" />
              ) : (
                <CheckCircle className="h-4 w-4" />
              )}
              <AlertTitle>Generation Complete</AlertTitle>
              <AlertDescription>
                Successfully generated {result.success} thumbnails.
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
