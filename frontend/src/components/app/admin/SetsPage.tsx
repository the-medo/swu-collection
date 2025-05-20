import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import { ExtendedColumnDef } from '@/components/ui/data-table';
import { setArray, SetInfo } from '../../../../../lib/swu-resources/set-info';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, AlertCircle, Image } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useGenerateSetThumbnails } from '@/api/sets/useGenerateSetThumbnails';
import { SwuSet } from '../../../../../types/enums';

export function SetsPage() {
  const [generatingSet, setGeneratingSet] = useState<SwuSet | null>(null);
  const [result, setResult] = useState<{ set: SwuSet; thumbnailUrls: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generateThumbnails = useGenerateSetThumbnails();

  const handleGenerateThumbnails = async (set: SwuSet) => {
    setGeneratingSet(set);
    setResult(null);
    setError(null);

    try {
      const result = await generateThumbnails.mutateAsync({ set });
      // Find the result for this specific set
      const setResult2 = result.thumbnails.find(item => item.set === set);
      if (setResult2) {
        setResult(setResult2);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setGeneratingSet(null);
    }
  };

  const columns = useMemo<ExtendedColumnDef<SetInfo>[]>(
    () => [
      {
        id: 'logo',
        header: 'Logo',
        cell: ({ row }) => {
          const setCode = row.original.code;
          const logoUrl = `https://images.swubase.com/logos/${setCode}.png`;
          return (
            <div className="flex items-center justify-center">
              <img
                src={logoUrl}
                alt={`${row.original.name} logo`}
                width={40}
                height={40}
                className="rounded-md"
              />
            </div>
          );
        },
      },
      {
        id: 'code',
        accessorKey: 'code',
        header: 'Code',
        cell: ({ getValue }) => {
          const code = getValue() as string;
          return <div className="font-medium">{code.toUpperCase()}</div>;
        },
      },
      {
        id: 'name',
        accessorKey: 'name',
        header: 'Name',
        cell: ({ getValue }) => {
          const name = getValue() as string;
          return <div>{name}</div>;
        },
      },
      {
        id: 'cardCount',
        accessorKey: 'cardCount',
        header: 'Card Count',
        cell: ({ getValue }) => {
          const cardCount = getValue() as number;
          return <div>{cardCount}</div>;
        },
      },
      {
        id: 'sortValue',
        accessorKey: 'sortValue',
        header: 'Sort Value',
        cell: ({ getValue }) => {
          const sortValue = getValue() as number;
          return <div>{sortValue}</div>;
        },
      },
      {
        id: 'expansionId',
        accessorKey: 'expansionId',
        header: 'Expansion ID',
        cell: ({ getValue }) => {
          const expansionId = getValue() as number;
          return <div>{expansionId}</div>;
        },
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => {
          const set = row.original.code as SwuSet;
          const isGenerating = generatingSet === set;

          return (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleGenerateThumbnails(set)}
              disabled={isGenerating || !!generatingSet}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Image className="mr-2 h-4 w-4" />
                  Generate Thumbnails
                </>
              )}
            </Button>
          );
        },
      },
    ],
    [generatingSet, result],
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Star Wars Unlimited Sets</CardTitle>
          <CardDescription>
            View information about all available Star Wars Unlimited card sets.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable columns={columns} data={setArray} />

          {error && (
            <Alert variant="destructive" className="mt-6">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {result && (
            <Alert variant="default" className="mt-6">
              <CheckCircle className="h-4 w-4" />
              <AlertTitle>Thumbnails Generated</AlertTitle>
              <AlertDescription>
                Successfully generated {result.thumbnailUrls.length} thumbnails for set{' '}
                {result.set.toUpperCase()}.
              </AlertDescription>
              <div className="mt-4 grid grid-cols-2 gap-2">
                {result.thumbnailUrls.map((url, index) => (
                  <a
                    key={index}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-500 hover:underline"
                  >
                    {url.split('/').pop()}
                  </a>
                ))}
              </div>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
