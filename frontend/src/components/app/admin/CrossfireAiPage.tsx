import { useState } from 'react';
import { AiReleaseUpload } from './AiReleaseUpload';
import { BrainCircuit, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAiReleases, useAiReleasePreview, useActivateAiRelease } from '@/api/crossfire-ai';
import type { AiSelection, AiVersions } from '../../../../../shared/types/crossfire-ai-releases';

const sameTarget = (a: AiVersions, b: AiVersions) =>
  (['state', 'engine', 'cards', 'rules', 'format'] as const).every(k => a[k] === b[k]);

export function CrossfireAiPage() {
  const releases = useAiReleases(),
    preview = useAiReleasePreview(),
    activate = useActivateAiRelease();
  const [selection, setSelection] = useState<AiSelection | null>(null);
  const [success, setSuccess] = useState('');
  function inspect(value: AiSelection) {
    setSelection(value);
    setSuccess('');
    preview.reset();
    activate.reset();
    preview.mutate(value);
  }
  async function confirm() {
    if (!selection || !preview.data?.ready) return;
    try {
      await activate.mutateAsync({
        ...selection,
        versions: preview.data.versions,
        expectedActive: preview.data.current,
      });
      setSuccess(
        `${preview.data.release.leader.label} now uses ${preview.data.release.label} for new games.`,
      );
      setSelection(null);
    } catch {
      /* Keep the reviewed selection and display the server error. */
    }
  }
  const data = releases.data;
  return (
    <div className="space-y-5" data-testid="crossfire-ai-admin">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-semibold">
            <BrainCircuit className="size-5" />
            Crossfire AI
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Release a leader independently. Existing games keep their original model.
          </p>
        </div>
        <Button
          variant="outline"
          disabled={releases.isFetching}
          onClick={() => void releases.refetch()}
        >
          <RefreshCw className={releases.isFetching ? 'animate-spin' : ''} />
          Check for releases
        </Button>
      </div>
      {releases.isPending && <p role="status">Loading AI releases…</p>}
      {releases.error && (
        <p role="alert" className="text-destructive">
          {releases.error.message}
        </p>
      )}
      {success && (
        <p role="status" className="rounded-md border border-primary/30 bg-primary/10 p-3 text-sm">
          {success}
        </p>
      )}
      {data && (
        <>
          <AiReleaseUpload />
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">Engine {data.versions.engine}</Badge>
            <Badge variant="outline">Cards {data.versions.cards.split('@')[0]}</Badge>
          </div>
          {(!data.remoteConfigured || !data.inferenceConfigured) && (
            <p className="rounded-md border p-3 text-sm">
              {!data.remoteConfigured &&
                'R2 is not configured; uploaded releases are retained in the database. '}
              {!data.inferenceConfigured &&
                'Connect the private inference service before activating models. '}
              Published models are reviewed here before they become available for new games.
            </p>
          )}
          {data.remoteError && (
            <p role="alert" className="text-destructive">
              {data.remoteError}
            </p>
          )}
          <section className="space-y-3" aria-labelledby="ai-model-releases">
            <h3 id="ai-model-releases" className="font-semibold">
              Leader releases
            </h3>
            {!data.releases.length && (
              <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                No model releases yet. Publish an evaluated leader checkpoint from the training
                server to review it here.
              </div>
            )}
            <div className="divide-y rounded-md border empty:hidden">
              {data.releases.map(release => {
                const active = data.active.some(
                  a => a.releaseId === release.id && sameTarget(a.target, data.versions),
                );
                const wasActive = data.history.some(h => h.releaseId === release.id);
                const evaluation = release.evaluations.find(e =>
                  sameTarget(e.versions, data.versions),
                );
                return (
                  <div
                    key={release.id}
                    className="flex flex-wrap items-center justify-between gap-3 p-4"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{release.leader.label}</span>
                        <Badge variant="outline">{release.label}</Badge>
                        {active && <Badge>Active</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {release.games.toLocaleString()} training games · {release.decks.length}{' '}
                        deck {release.decks.length === 1 ? 'list' : 'lists'} ·{' '}
                        {release.installed ? 'Installed' : 'Available on R2'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {evaluation
                          ? `${evaluation.games.toLocaleString()} evaluation games · ${((100 * evaluation.wins) / Math.max(1, evaluation.games)).toFixed(1)}% wins`
                          : 'No evaluation for the active engine/card release'}
                        {!release.eligible && ' · Not ready to activate'}
                        {!release.playable && ' · Repackage with a playable decklist'}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      disabled={preview.isPending || active}
                      onClick={() => inspect({ id: release.id, checksum: release.checksum })}
                    >
                      {wasActive && !active ? 'Review rollback' : 'Review release'}
                    </Button>
                  </div>
                );
              })}
            </div>
          </section>
          <section className="space-y-2 rounded-lg border p-4" aria-labelledby="ai-datasets">
            <h3 id="ai-datasets" className="font-semibold">
              Live-game learning data
            </h3>
            <p className="text-sm text-muted-foreground">
              Games are eligible only after both players opt in. Uploading data does not change
              production models.
            </p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(data.datasets).map(([key, count]) => (
                <Badge key={key} variant="secondary">
                  {count.toLocaleString()} {key}
                </Badge>
              ))}
            </div>
            {data.datasetFailures?.map(f => (
              <p key={f.category} className="text-sm text-muted-foreground">
                {f.count}{' '}
                {f.category === 'history'
                  ? 'histories quarantined (undo, integrity or adapter incompatibility)'
                  : 'storage failures awaiting retry or inspection'}
                .
              </p>
            ))}
          </section>
          {data.history.length > 0 && (
            <details className="rounded-lg border p-4">
              <summary className="cursor-pointer text-sm font-medium">Activation history</summary>
              <ul className="mt-3 space-y-2 text-xs text-muted-foreground">
                {data.history.map((entry, i) => (
                  <li key={`${entry.at}-${i}`}>
                    {new Date(entry.at).toLocaleString()} ·{' '}
                    {data.releases.find(r => r.id === entry.releaseId)?.label ?? entry.releaseId}
                    {entry.previousId ? ' · Replaced previous release' : ' · First activation'}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </>
      )}
      <Dialog
        open={selection !== null}
        onOpenChange={open => {
          if (!open && !activate.isPending) setSelection(null);
        }}
      >
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Review leader release</DialogTitle>
            <DialogDescription>
              Validate compatibility and inspect results before changing this leader’s model for new
              games.
            </DialogDescription>
          </DialogHeader>
          {preview.isPending && (
            <p role="status">Downloading, validating and loading model dependencies…</p>
          )}
          {(preview.error || activate.error) && (
            <p role="alert" className="text-sm text-destructive">
              {(preview.error || activate.error)?.message}
            </p>
          )}
          {preview.data && (
            <div className="space-y-4">
              <p className="font-medium">
                {preview.data.release.leader.label} · {preview.data.release.label}
              </p>
              <p className="text-sm text-muted-foreground">{preview.data.message}</p>
              <ul className="space-y-1 text-sm">
                {preview.data.release.decks.map(d => (
                  <li key={d.key}>
                    {d.label}{' '}
                    <span className="text-muted-foreground">· {d.archetypes.join(', ')}</span>
                  </li>
                ))}
              </ul>
              {preview.data.release.evaluations.map((evaluation, i) => (
                <div key={i} className="rounded-md border p-3 text-sm">
                  <p className="font-medium">
                    Engine {evaluation.versions.engine} · Cards{' '}
                    {evaluation.versions.cards.split('@')[0]}
                  </p>
                  <p className="mb-2 text-xs text-muted-foreground">
                    {evaluation.games} completed games · {evaluation.cutoffs} cutoffs ·{' '}
                    {evaluation.replayChecked} replays verified
                  </p>
                  <div className="space-y-1">
                    {evaluation.byOpponent.map(opponent => (
                      <p key={opponent.deck} className="flex justify-between gap-4">
                        <span>{opponent.deck}</span>
                        <span>
                          {opponent.wins} / {opponent.games} wins
                        </span>
                      </p>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              disabled={activate.isPending}
              onClick={() => setSelection(null)}
            >
              Cancel
            </Button>
            <Button
              disabled={!preview.data?.ready || preview.isPending || activate.isPending}
              onClick={() => void confirm()}
            >
              {activate.isPending ? 'Activating…' : 'Activate for this leader'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
