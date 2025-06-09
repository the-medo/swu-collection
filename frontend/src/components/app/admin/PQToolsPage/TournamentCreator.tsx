import { useState } from 'react';
import { Button } from '@/components/ui/button.tsx';
import { Label } from '@/components/ui/label.tsx';
import { toast } from '@/hooks/use-toast.ts';
import FormatSelect from '@/components/app/decks/components/FormatSelect.tsx';
import MetaSelector from '@/components/app/global/MetaSelector/MetaSelector.tsx';
import { usePostTournament } from '@/api/tournaments/usePostTournament.ts';
import { PQTournament } from './types';

interface TournamentCreatorProps {
  data: PQTournament[];
}

export function TournamentCreator({ data }: TournamentCreatorProps) {
  const [formatId, setFormatId] = useState<number | null>(null);
  const [metaId, setMetaId] = useState<number | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const postTournament = usePostTournament();

  const handleCreate = async () => {
    if (!formatId) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please select a format',
      });
      return;
    }

    if (!Array.isArray(data) || data.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No tournament data to create',
      });
      return;
    }

    setIsCreating(true);

    try {
      // Create each tournament
      const promises = data.map(tournament => {
        return postTournament.mutateAsync({
          type: 'pq',
          location: tournament.location,
          continent: tournament.continent,
          name: tournament.name,
          attendance: 0,
          meleeId: '',
          format: formatId,
          meta: metaId,
          days: 1,
          dayTwoPlayerCount: 0,
          date: tournament.date,
          bracketInfo: 'top8',
        });
      });

      await Promise.all(promises);

      toast({
        title: 'Success',
        description: `Created ${data.length} tournaments successfully`,
      });
    } catch (error) {
      console.error('Error creating tournaments:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to create tournaments',
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="mt-8 border-t pt-6">
      <h3 className="text-lg font-medium mb-4">Create Tournaments</h3>
      <p className="text-sm text-gray-500 mb-4">
        Select a format and meta (optional) to create tournaments from the parsed data.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <Label htmlFor="format-select" className="mb-2 block">
            Format (required)
          </Label>
          <FormatSelect value={formatId} onChange={setFormatId} allowEmpty={true} />
        </div>
        <div>
          <Label htmlFor="meta-select" className="mb-2 block">
            Meta (optional)
          </Label>
          <MetaSelector
            value={metaId}
            onChange={setMetaId}
            emptyOption={true}
            formatId={formatId || undefined}
          />
        </div>
      </div>

      <Button
        onClick={handleCreate}
        disabled={isCreating || !formatId || data.length === 0}
        className="mt-2"
      >
        {isCreating ? 'Creating...' : `Create ${data.length} Tournaments`}
      </Button>
    </div>
  );
}
