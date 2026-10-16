import { useState, useId } from 'react';
import { Check, Plus, ChartNoAxesCombined } from 'lucide-react';
import { Input } from '@/components/ui/input.tsx';
import { useEditorMeta } from '@/api/rich-text-editor/useEditorMeta.ts';
import { MetaEmbed } from './MetaEmbed.tsx';
import { PickerBody, PickerFooter, PickerNotice } from './PickerLayout.tsx';
import { Button } from '@/components/ui/button.tsx';
import { widgetSchema, type Widget } from './model.ts';

export function MetaAnalysisPicker({
  initial,
  onSelect,
}: {
  initial?: Extract<Widget, { kind: 'meta-analysis' }>;
  onSelect: (value: Widget) => void;
}) {
  const kind = 'meta-analysis';
  const fieldId = useId();
  const [scope, setScope] = useState(initial?.scope ?? 'tournament');
  const [id, setId] = useState(initial?.id ?? '');
  const [loaded, setLoaded] = useState(initial);
  const [error, setError] = useState('');
  const meta = useEditorMeta(loaded ?? { scope, id: '' });
  const parsed = widgetSchema.safeParse(loaded);
  const selectClass =
    'h-10 w-full rounded-lg border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

  const guidance = initial
    ? 'Adjust the chart and save your changes.'
    : 'Load a preview and adjust its filters before inserting.';
  return (
    <>
      <PickerBody>
        <div className="space-y-4 rounded-xl border bg-muted/20 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <ChartNoAxesCombined className="size-4 text-muted-foreground" aria-hidden />
            Choose your results
          </div>
          <div className="grid gap-3 sm:grid-cols-[180px_1fr]">
            <div className="grid gap-2 text-xs font-medium">
              <label htmlFor={`${fieldId}-scope`}>Scope</label>
              <select
                id={`${fieldId}-scope`}
                className={selectClass}
                value={scope}
                onChange={e => {
                  setScope(e.target.value as typeof scope);
                  setLoaded(undefined);
                }}
              >
                <option value="tournament">Tournament</option>
                <option value="group">Tournament group</option>
              </select>
            </div>
            <div className="grid gap-2 text-xs font-medium">
              <label htmlFor={`${fieldId}-id`}>Tournament or group ID</label>
              <Input
                id={`${fieldId}-id`}
                className="bg-background"
                value={id}
                onChange={e => {
                  setId(e.target.value);
                  setLoaded(undefined);
                }}
                placeholder="Paste the ID from its SWUBASE URL"
                autoFocus
              />
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <p className="flex-1 text-xs leading-relaxed text-muted-foreground">
              Copy the ID from a tournament or group URL. Your chart uses the latest results
              whenever the article opens.
            </p>
            <Button
              variant="outline"
              className="shrink-0"
              onClick={() => {
                const result = widgetSchema.safeParse({
                  kind,
                  scope,
                  id: id.trim(),
                  settings: loaded?.settings ?? initial?.settings ?? {},
                });
                if (!result.success || result.data.kind !== 'meta-analysis') {
                  setError('Enter a valid tournament or tournament-group UUID.');
                  return;
                }
                setError('');
                setLoaded(result.data);
              }}
            >
              Load preview
            </Button>
          </div>
        </div>
        {loaded ? (
          <div className="min-w-0 rounded-xl border p-3 sm:p-4">
            <MetaEmbed value={loaded} onChange={setLoaded} />
          </div>
        ) : (
          <div className="rounded-xl border border-dashed bg-muted/10">
            <PickerNotice title="Your meta chart will appear here" icon={ChartNoAxesCombined}>
              Load results to explore leaders, bases, and tournament finishes.
            </PickerNotice>
          </div>
        )}
        {error && (
          <p
            role="alert"
            className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive"
          >
            {error}
          </p>
        )}
      </PickerBody>
      <PickerFooter hint={guidance}>
        <Button
          disabled={!parsed.success || meta.isPending || meta.isError}
          onClick={() => {
            if (parsed.success) onSelect(parsed.data);
          }}
        >
          {initial ? <Check aria-hidden /> : <Plus aria-hidden />}
          {initial ? 'Save changes' : 'Insert chart'}
        </Button>
      </PickerFooter>
    </>
  );
}
