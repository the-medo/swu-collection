import { useState } from 'react';
import { Download, RefreshCw, Check, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  useCardReleases,
  useCardReleasePreview,
  useActivateCardRelease,
} from '@/api/crossfire-card-releases';
import type { CardReleaseSelection } from '../../../../../shared/types/crossfire-card-releases';
export function CrossfireCardsPage() {
  const releases = useCardReleases(),
    preview = useCardReleasePreview(),
    activate = useActivateCardRelease();
  const [selection, setSelection] = useState<CardReleaseSelection | null>(null);
  const [success, setSuccess] = useState('');
  const inspect = (value: CardReleaseSelection) => {
    setSelection(value);
    setSuccess('');
    activate.reset();
    preview.reset();
    preview.mutate(value);
  };
  const confirm = async () => {
    if (!selection || !preview.data) return;
    try {
      await activate.mutateAsync({ ...selection, expectedActive: preview.data.currentVersion });
      setSuccess(`Card release ${selection.version} is active for new matches.`);
      setSelection(null);
    } catch {
      /* The dialog retains the selection and displays the mutation error. */
    }
  };
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Crossfire card releases</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Update card implementations without restarting games.
          </p>
        </div>
        <Button
          variant="outline"
          disabled={releases.isFetching}
          onClick={() => {
            void releases.refetch();
          }}
        >
          <RefreshCw className={releases.isFetching ? 'animate-spin' : ''} />
          Check for updates
        </Button>
      </div>
      {releases.isPending && <p role="status">Loading card releases…</p>}
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
      {releases.data && (
        <>
          <div className="flex flex-wrap gap-3 text-sm">
            <Badge variant="secondary">Engine {releases.data.engineVersion}</Badge>
            <Badge>Active cards {releases.data.activeVersion}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Existing matches and replays keep their original card definitions. Earlier installed
            releases can be activated for new matches.
          </p>
          {!releases.data.remoteConfigured && (
            <p className="rounded-md border p-3 text-sm">
              R2 updates are not configured. Set CROSSFIRE_CARD_BUNDLE_BUCKET and the R2 credentials
              on the API container. Installed releases are available below.
            </p>
          )}
          {releases.data.remoteError && (
            <p role="alert" className="text-destructive">
              {releases.data.remoteError}
            </p>
          )}
          <div className="divide-y rounded-md border">
            {releases.data.releases.map(release => (
              <div
                key={release.checksum}
                className="flex flex-wrap items-center justify-between gap-3 p-4"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{release.version}</span>
                    {release.version === releases.data.activeVersion && <Badge>Active</Badge>}
                    <Badge variant="outline">
                      {release.installed ? 'Installed' : 'Available on R2'}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Requires engine {release.requiredEngine} ·{' '}
                    {new Date(release.createdAt).toLocaleDateString()}
                    {!release.compatible && ' · Deploy a compatible engine to use this release'}
                  </p>
                </div>
                <Button
                  variant="outline"
                  disabled={
                    !release.compatible ||
                    release.version === releases.data.activeVersion ||
                    preview.isPending
                  }
                  onClick={() =>
                    inspect({
                      version: release.version,
                      checksum: release.checksum,
                      source: release.installed ? 'installed' : 'remote',
                    })
                  }
                >
                  {release.installed ? <ArrowRight /> : <Download />}Review changes
                </Button>
              </div>
            ))}
          </div>
        </>
      )}
      <Dialog
        open={selection !== null}
        onOpenChange={open => {
          if (!open && !activate.isPending) setSelection(null);
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Card release {selection?.version}</DialogTitle>
            <DialogDescription>
              Review the changes before activating this release for new matches.
            </DialogDescription>
          </DialogHeader>
          {preview.isPending && <p role="status">Downloading and validating definitions…</p>}
          {(preview.error || activate.error) && (
            <p role="alert" className="text-sm text-destructive">
              {(preview.error || activate.error)?.message}
            </p>
          )}
          {preview.data && (
            <>
              <div className="flex flex-wrap gap-2 text-sm">
                <Badge variant="secondary">{preview.data.total} implemented cards</Badge>
                <Badge variant="outline">{preview.data.added.length} added</Badge>
                <Badge variant="outline">{preview.data.changed.length} changed</Badge>
                <Badge variant="outline">{preview.data.removed.length} removed</Badge>
              </div>
              <div className="max-h-72 space-y-4 overflow-auto">
                {(['added', 'changed', 'removed'] as const).map(
                  kind =>
                    preview.data[kind].length > 0 && (
                      <section key={kind}>
                        <h3 className="mb-1 font-medium capitalize">{kind}</h3>
                        <ul className="space-y-1 text-sm text-muted-foreground">
                          {preview.data[kind].map(card => (
                            <li key={card.cardId}>{card.name}</li>
                          ))}
                        </ul>
                      </section>
                    ),
                )}
                {!preview.data.added.length &&
                  !preview.data.changed.length &&
                  !preview.data.removed.length && (
                    <p className="text-sm text-muted-foreground">
                      No card behavior changes. This release may update card-naming metadata.
                    </p>
                  )}
              </div>
              <p className="text-xs text-muted-foreground">
                Replaces active release {preview.data.currentVersion}. Running games and BO3 matches
                retain their current release.
              </p>
            </>
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
              disabled={!preview.data || preview.isPending || activate.isPending}
              onClick={() => {
                void confirm();
              }}
            >
              <Check />
              {activate.isPending ? 'Activating…' : 'Activate release'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
