import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select.tsx';
import * as React from 'react';
import { useCallback, useEffect, useMemo } from 'react';
import { useGetTournaments } from '@/api/tournaments/useGetTournaments';

interface TournamentSelectorProps {
  value: string | null;
  onChange: (value: string | null) => void;
  metaId?: number;
}

export function TournamentSelector({ value, onChange, metaId }: TournamentSelectorProps) {
  const { data, isLoading } = useGetTournaments({
    meta: metaId,
    sort: 'tournament.date',
    limit: 250,
    order: 'desc',
  });

  const tournaments = useMemo(() => {
    if (!data) return [];

    // Flatten the pages to get all tournaments
    return data.pages.flatMap(page => page.data);
  }, [data]);

  const [selectedTournament, setSelectedTournament] = React.useState<string | 'empty'>(
    value ?? 'empty',
  );

  useEffect(() => {
    setSelectedTournament(value ?? 'empty');
  }, [value]);

  const onChangeHandler = useCallback(
    (v: string) => {
      const tournamentId = v === 'empty' ? null : v;
      onChange(tournamentId);
      setSelectedTournament(v);
    },
    [onChange],
  );

  return (
    <Select
      value={selectedTournament === 'empty' ? 'empty' : selectedTournament}
      onValueChange={onChangeHandler}
      disabled={isLoading}
    >
      <SelectTrigger>
        <SelectValue placeholder="Select Tournament" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="empty">- Select Tournament -</SelectItem>
        {tournaments.map(tournament => (
          <SelectItem key={tournament.tournament.id} value={tournament.tournament.id}>
            <div className="flex gap-2 grow justify-between">
              <span>{tournament.tournament.name}</span>
              <span className="text-muted-foreground">
                {new Date(tournament.tournament.date).toLocaleDateString()} -{' '}
                {tournament.tournament.location}
              </span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
