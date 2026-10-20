import { useId, useState } from 'react';
import { Layers3 } from 'lucide-react';
import { useEditorPool } from '@/api/rich-text-editor/useEditorPool.ts';
import { Input } from '@/components/ui/input.tsx';
import { Button } from '@/components/ui/button.tsx';
import { poolIdFromInput } from '../../../../../../shared/posts/pool.ts';
import { PickerBody, PickerFooter, PickerNotice } from './PickerLayout.tsx';
import { PoolPreview } from './PoolPreview.tsx';

export function PoolPicker({
  initialId,
  onSelect,
}: {
  initialId?: string;
  onSelect: (poolId: string) => void;
}) {
  const fieldId = useId();
  const [input, setInput] = useState(initialId ?? '');
  const [selected, setSelected] = useState(initialId);
  const [error, setError] = useState('');
  const query = useEditorPool(selected);
  const ready = !!selected && !!query.data && !query.isFetching && !query.isError;
  return (
    <>
      <PickerBody>
        <form
          className="space-y-3"
          onSubmit={event => {
            event.preventDefault();
            const id = poolIdFromInput(input);
            setError(id ? '' : 'Enter a sealed pool link or a valid pool ID.');
            setSelected(id);
          }}
        >
          <label htmlFor={fieldId} className="block text-sm font-medium">
            SWUBASE pool link or ID
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              id={fieldId}
              className="min-w-0 flex-1"
              placeholder="Paste a sealed pool link or ID…"
              value={input}
              onChange={event => {
                setInput(event.target.value);
                setSelected(undefined);
                setError('');
              }}
            />
            <Button type="submit" variant="outline">
              Find pool
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Choose a ready public or unlisted sealed pool.
          </p>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
        </form>
        {selected &&
          (query.isPending || query.isFetching ? (
            <PickerNotice loading title="Loading sealed pool…" />
          ) : query.isError ? (
            <PickerNotice error title="This sealed pool is unavailable">
              <p>It must be a ready public or unlisted sealed pool.</p>
              <Button variant="outline" className="mt-3" onClick={() => void query.refetch()}>
                Try again
              </Button>
            </PickerNotice>
          ) : (
            <PoolPreview pool={query.data} />
          ))}
      </PickerBody>
      <PickerFooter hint="Readers see the pool’s current title and leaders. Build this pool opens in a new tab.">
        <Button
          type="button"
          disabled={!ready}
          onClick={() => {
            if (ready && query.data) onSelect(query.data.id);
          }}
        >
          <Layers3 className="size-4" /> {initialId ? 'Update pool' : 'Insert pool'}
        </Button>
      </PickerFooter>
    </>
  );
}
