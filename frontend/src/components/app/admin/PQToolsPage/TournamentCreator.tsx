import { useState } from 'react';
import { Button } from '@/components/ui/button.tsx';
import { Label } from '@/components/ui/label.tsx';
import { toast } from '@/hooks/use-toast.ts';
import MetaSelector from '@/components/app/global/MetaSelector/MetaSelector.tsx';
import { usePostTournament } from '@/api/tournaments/usePostTournament.ts';
import { isPQFormat, PQ_FORMAT_IDS, PQ_FORMATS, type PQFormat, type PQTournament } from './types';

interface TournamentCreatorProps {
  data: PQTournament[];
}

export function TournamentCreator({ data }: TournamentCreatorProps) {
  const [metaIds, setMetaIds] = useState<Record<PQFormat, number | null>>({
    Premier: null,
    'Sealed play': null,
    Eternal: null,
  });
  const [isCreating, setIsCreating] = useState(false);
  const postTournament = usePostTournament();

  const handleCreate = async () => {
    if (!Array.isArray(data) || data.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No tournament data to create',
      });
      return;
    }

    const invalidFormatCount = data.filter(tournament => !isPQFormat(tournament.format)).length;
    if (invalidFormatCount > 0) {
      toast({
        variant: 'destructive',
        title: 'Invalid PQ format',
        description: `${invalidFormatCount} tournament${invalidFormatCount === 1 ? '' : 's'} must use Premier, Sealed play, or Eternal.`,
      });
      return;
    }

    setIsCreating(true);

    try {
      // Create each tournament
      const promises = data.map(tournament => {
        const format = PQ_FORMAT_IDS[tournament.format];
        return postTournament.mutateAsync({
          type: 'pq',
          location: tournament.location,
          continent: tournament.continent,
          name: tournament.name,
          attendance: 0,
          meleeId: '',
          format,
          meta: metaIds[tournament.format],
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
        Choose an optional meta for each fixed PQ format. Each tournament will use the meta selected
        for its own format.
      </p>

      <div className="space-y-4 mb-4">
        {PQ_FORMATS.map(format => (
          <div key={format} className="grid grid-cols-1 md:grid-cols-[180px_minmax(0,1fr)] gap-2 items-center">
            <Label>{format}</Label>
            <MetaSelector
              value={metaIds[format]}
              onChange={metaId => setMetaIds(current => ({ ...current, [format]: metaId }))}
              emptyOption={true}
              formatId={PQ_FORMAT_IDS[format]}
              showFormat={false}
            />
          </div>
        ))}
      </div>

      <Button
        onClick={handleCreate}
        disabled={isCreating || data.length === 0}
        className="mt-2"
      >
        {isCreating ? 'Creating...' : `Create ${data.length} Tournaments`}
      </Button>
    </div>
  );
}
