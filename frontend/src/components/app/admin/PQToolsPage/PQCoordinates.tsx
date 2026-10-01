import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button.tsx';
import { AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion.tsx';
import SetSelect from '@/components/app/global/SetSelect.tsx';
import { usePermissions } from '@/hooks/usePermissions.ts';
import {
  computeTournamentCoordinates,
  invalidateTournamentLocations,
  useTournamentLocations,
} from '@/api/tournaments/useTournamentLocation.ts';
import { TournamentAdditionalInfoDialog } from '@/components/app/tournaments/location/TournamentAdditionalInfoDialog.tsx';
import type { SwuSet } from '../../../../../../types/enums.ts';
import type { TournamentLocationData } from '../../../../../../types/TournamentLocation.ts';
import type { ErrorWithStatus } from '../../../../../../types/ErrorWithStatus.ts';
import { setArraySorted } from '../../../../../../lib/swu-resources/set-info.ts';

export function PQCoordinates({ open }: { open: boolean }) {
  const canAccessAdmin = usePermissions()('admin', 'access');
  const [set, setSet] = useState<SwuSet | null>(setArraySorted[0] ?? null);
  const [force, setForce] = useState(false);
  const [running, setRunning] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [results, setResults] = useState<Record<string, string>>({});
  const [summary, setSummary] = useState('');
  const [editing, setEditing] = useState<TournamentLocationData | null>(null);
  const stop = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      stop.current = true;
    };
  }, []);
  const query = useTournamentLocations(set, canAccessAdmin && open);
  const client = useQueryClient();
  const tournaments = query.data ?? [];
  const targets = tournaments.filter(t => force || !t.coordinates);
  const run = async () => {
    stop.current = false;
    setRunning(true);
    setStopping(false);
    setResults({});
    setSummary('');
    let completed = 0;
    let saved = 0;
    try {
      for (const tournament of targets) {
        if (stop.current) break;
        let result: string;
        try {
          const response = await computeTournamentCoordinates(tournament.id, force);
          if (response.status === 'updated') saved++;
          result =
            response.status === 'updated'
              ? `Saved (${response.tournament.additionalInfo.locationPrecision})`
              : 'Already saved';
        } catch (err) {
          result = err instanceof Error ? err.message : 'Failed to get coordinates';
          if ([429, 503].includes((err as ErrorWithStatus).status ?? 0)) stop.current = true;
        }
        completed++;
        if (mounted.current) {
          setResults(current => ({ ...current, [tournament.id]: result }));
          setSummary(`${completed} of ${targets.length} processed · ${saved} saved`);
        }
      }
    } finally {
      await invalidateTournamentLocations(client);
      if (mounted.current) {
        setSummary(
          `${stop.current ? 'Stopped' : 'Finished'}: ${completed} of ${targets.length} processed · ${saved} saved`,
        );
        setRunning(false);
        setStopping(false);
      }
    }
  };
  if (!canAccessAdmin) return null;
  return (
    <AccordionItem value="coordinates">
      <AccordionTrigger>PQ Coordinates</AccordionTrigger>
      <AccordionContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Get coordinates for saved PQ tournaments. Select a set, or leave it empty for all sets.
          Entries need an address or city in additional info; older imports may need these fields
          added.
        </p>
        <fieldset disabled={running} className="space-y-3">
          <div className="max-w-sm">
            <SetSelect
              value={set}
              onChange={value => {
                setSet(value);
                setResults({});
                setSummary('');
              }}
              emptyOption
              showFullName
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={force} onChange={e => setForce(e.target.checked)} />
            Recompute existing coordinates
          </label>
        </fieldset>
        {query.isPending && <p role="status">Loading tournaments…</p>}
        {query.error && (
          <div role="alert">
            <p className="text-destructive">{query.error.message}</p>
            <Button variant="outline" onClick={() => void query.refetch()}>
              Retry
            </Button>
          </div>
        )}
        {query.data && (
          <p className="text-sm">
            {tournaments.length} tournaments · {tournaments.filter(t => t.coordinates).length} with
            coordinates · {targets.length} to process
          </p>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <Button
            disabled={running || query.isFetching || !targets.length || !!query.error}
            onClick={() => void run()}
          >
            {running ? 'Getting coordinates…' : `Get and save coordinates (${targets.length})`}
          </Button>
          {running && (
            <Button
              variant="outline"
              disabled={stopping}
              onClick={() => {
                stop.current = true;
                setStopping(true);
              }}
            >
              {stopping ? 'Stopping after current request…' : 'Stop'}
            </Button>
          )}
          <p role="status" className="text-sm">
            {summary}
          </p>
        </div>
        {query.data?.length === 0 && <p>No PQ tournaments match this set.</p>}
        {tournaments.length > 0 && (
          <div className="max-h-[480px] overflow-auto border rounded-md">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted">
                <tr>
                  <th className="p-2">Tournament</th>
                  <th className="p-2">Location / result</th>
                  <th className="p-2">Edit</th>
                </tr>
              </thead>
              <tbody>
                {tournaments.map(t => (
                  <tr key={t.id} className="border-t">
                    <td className="p-2">
                      {t.name}
                      <div className="text-muted-foreground">{t.date.slice(0, 10)}</div>
                    </td>
                    <td className="p-2">
                      {results[t.id] ??
                        (t.coordinates
                          ? `${t.coordinates.y}, ${t.coordinates.x} (${t.additionalInfo.locationPrecision ?? 'unknown precision'})`
                          : 'No coordinates')}
                    </td>
                    <td className="p-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={running}
                        onClick={() => setEditing(t)}
                      >
                        Additional info
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {editing && (
          <TournamentAdditionalInfoDialog tournament={editing} onClose={() => setEditing(null)} />
        )}
      </AccordionContent>
    </AccordionItem>
  );
}
