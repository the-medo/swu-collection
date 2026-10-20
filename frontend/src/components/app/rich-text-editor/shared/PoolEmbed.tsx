import { useEditorPool } from '@/api/rich-text-editor/useEditorPool.ts';
import { Button } from '@/components/ui/button.tsx';
import { PoolPreview } from './PoolPreview.tsx';
import { PickerNotice } from './PickerLayout.tsx';

export function PoolEmbed({ poolId }: { poolId: string }) {
  const query = useEditorPool(poolId);
  if (query.isPending) return <PickerNotice loading title="Loading sealed pool…" />;
  if (query.isError)
    return (
      <PickerNotice error title="Sealed pool unavailable">
        <p>This pool may be private, unfinished, or no longer available.</p>
        <Button
          variant="outline"
          className="mt-3"
          disabled={query.isFetching}
          onClick={() => void query.refetch()}
        >
          Try again
        </Button>
      </PickerNotice>
    );
  return <PoolPreview pool={query.data} />;
}
