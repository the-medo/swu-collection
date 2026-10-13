import { hubApi, creatorKeys, useHubQuery } from '@/api/creators';
import { Button } from '@/components/ui/button.tsx';
import { Status } from './CreatorControls.tsx';
import { creatorPanel } from './creatorStyles.ts';
import type { CreationDocument } from '../../../../../shared/creators/contracts.ts';
export function CreationHistory({
  id,
  restore,
}: {
  id: string;
  restore: (document: CreationDocument) => void;
}) {
  const revisions = useHubQuery(creatorKeys.revisions(id), () => hubApi.revisions(id), true, true);
  return (
    <div className={`${creatorPanel} space-y-2`}>
      <Status loading={revisions.isPending} error={revisions.error} />
      {revisions.data?.map(row => (
        <div
          key={row.revision}
          className="flex flex-wrap items-center justify-between gap-4 text-sm"
        >
          <span>
            Revision {row.revision} · {new Date(row.createdAt).toLocaleString()}
          </span>
          <Button size="sm" variant="outline" onClick={() => restore(row.document)}>
            Restore to draft
          </Button>
        </div>
      ))}
    </div>
  );
}
