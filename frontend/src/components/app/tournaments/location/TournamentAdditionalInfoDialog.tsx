import { useState } from 'react';
import Dialog from '@/components/app/global/Dialog.tsx';
import { Button } from '@/components/ui/button.tsx';
import {
  useComputeTournamentCoordinates,
  useSaveTournamentAdditionalInfo,
} from '@/api/tournaments/useTournamentLocation.ts';
import type { TournamentLocationData } from '../../../../../../types/TournamentLocation.ts';
import { AdditionalInfoEditor } from './AdditionalInfoEditor.tsx';
import { infoToRows, rowsToInfo } from './additionalInfoRows.ts';

// Mount on opening so server refetches do not replace unsaved edits.
export function TournamentAdditionalInfoDialog({
  tournament,
  onClose,
}: {
  tournament: TournamentLocationData;
  onClose: () => void;
}) {
  const [saved, setSaved] = useState(tournament);
  const [rows, setRows] = useState(() => infoToRows(tournament.additionalInfo));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const save = useSaveTournamentAdditionalInfo(tournament.id);
  const compute = useComputeTournamentCoordinates(tournament.id);
  const accept = (data: TournamentLocationData) => {
    setSaved(data);
    setRows(infoToRows(data.additionalInfo));
  };
  const submit = async (recompute: boolean) => {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const additionalInfo = rowsToInfo(rows);
      if (JSON.stringify(additionalInfo) !== JSON.stringify(saved.additionalInfo)) {
        const result = await save.mutateAsync({
          additionalInfo,
          expectedAdditionalInfo: saved.additionalInfo,
        });
        accept(result);
        setMessage('Additional info saved.');
      }
      if (recompute) {
        const result = await compute.mutateAsync();
        accept(result.tournament);
        setMessage('Coordinates saved.');
      } else setMessage('Additional info saved.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save changes.');
    } finally {
      setBusy(false);
    }
  };
  const precision = saved.additionalInfo.locationPrecision;
  return (
    <Dialog
      open
      onOpenChange={open => {
        if (!open && !busy) onClose();
      }}
      trigger={<button type="button" className="hidden" tabIndex={-1} aria-hidden="true" />}
      header="Additional info"
      headerDescription={tournament.name}
      size="medium"
    >
      <div className="space-y-4 p-1">
        <p className="text-sm">
          {saved.coordinates
            ? `Longitude: ${saved.coordinates.x}, latitude: ${saved.coordinates.y}`
            : 'No coordinates saved.'}
          {typeof precision === 'string' &&
            ` · Precision: ${precision}${precision === 'city' ? ' (approximate)' : ''}`}
        </p>
        <AdditionalInfoEditor rows={rows} onChange={setRows} disabled={busy} />
        <p className="text-sm text-muted-foreground">
          Changing address fields clears saved coordinates. Recompute saves your edits first and
          uses Geoapify. City-only entries receive an approximate location.
        </p>
        {message && (
          <p role="status" className="text-sm">
            {message}
          </p>
        )}
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <Button disabled={busy} onClick={() => void submit(false)}>
            Save all fields
          </Button>
          <Button disabled={busy} variant="outline" onClick={() => void submit(true)}>
            {busy ? 'Working…' : 'Save and recompute coordinates'}
          </Button>
          <Button disabled={busy} variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Geocoding by{' '}
          <a
            href="https://www.geoapify.com/"
            target="_blank"
            rel="noreferrer"
            className="underline"
          >
            Geoapify
          </a>
          , with{' '}
          <a
            href="https://www.openstreetmap.org/copyright"
            target="_blank"
            rel="noreferrer"
            className="underline"
          >
            OpenStreetMap
          </a>{' '}
          data. Provider attribution is stored in the geocoding field.
        </p>
      </div>
    </Dialog>
  );
}
