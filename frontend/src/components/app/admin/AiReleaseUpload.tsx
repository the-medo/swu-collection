import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useImportAiRelease } from '@/api/crossfire-ai';

export function AiReleaseUpload() {
  const upload = useImportAiRelease();
  const [manifest, setManifest] = useState<File>();
  const [weights, setWeights] = useState<File>();
  return (
    <details className="rounded-lg border p-4">
      <summary className="cursor-pointer text-sm font-medium">
        Upload an evaluated model release
      </summary>
      <div className="mt-4 space-y-3">
        <p className="text-sm text-muted-foreground">
          Upload the release manifest and matching weights from training, then review and activate
          the release below. Existing games keep their current opponent.
        </p>
        <label className="block space-y-1 text-sm">
          Release manifest
          <Input
            type="file"
            accept=".json"
            disabled={upload.isPending}
            onChange={e => {
              setManifest(e.target.files?.[0]);
              upload.reset();
            }}
          />
        </label>
        <label className="block space-y-1 text-sm">
          Model weights
          <Input
            type="file"
            accept=".pt"
            disabled={upload.isPending}
            onChange={e => {
              setWeights(e.target.files?.[0]);
              upload.reset();
            }}
          />
        </label>
        {upload.error && (
          <p role="alert" className="text-sm text-destructive">
            {upload.error.message}
          </p>
        )}
        {upload.isSuccess && (
          <p role="status" className="text-sm">
            Imported. Review the release to make it available for new games.
          </p>
        )}
        <Button
          type="button"
          disabled={!manifest || !weights || upload.isPending}
          onClick={() => manifest && weights && upload.mutate({ manifest, weights })}
        >
          {upload.isPending ? 'Validating model…' : 'Upload release'}
        </Button>
      </div>
    </details>
  );
}
