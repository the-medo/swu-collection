import { useState } from 'react';
import { useEditorMeta } from '@/api/rich-text-editor/useEditorMeta.ts';
import TournamentMetaAnalyzer from '@/components/app/tournaments/TournamentMeta/TournamentMetaAnalyzer.tsx';
import { Button } from '@/components/ui/button.tsx';
import { insertionHref, type Widget } from './model.ts';

type MetaWidget = Extract<Widget, { kind: 'meta-analysis' }>;
export function MetaEmbed({
  value,
  onChange,
}: {
  value: MetaWidget;
  onChange?: (value: MetaWidget) => void;
}) {
  const [previewSettings, setPreviewSettings] = useState(value.settings);
  const data = useEditorMeta(value);
  return (
    <section className="rte-meta space-y-3" data-meta-id={value.id}>
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="rte-eyebrow">
            Live meta analysis · {value.scope === 'group' ? 'Tournament group' : 'Tournament'}
          </div>
          <strong>{data.data?.name ?? value.id}</strong>
        </div>
        <a
          href={insertionHref(value)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm underline"
        >
          Open analysis ↗
        </a>
      </header>
      {data.isPending ? (
        <p role="status">Loading tournament decks…</p>
      ) : data.isError ? (
        <div role="alert">
          {data.error.message}{' '}
          <Button size="sm" onClick={() => void data.refetch()}>
            Try again
          </Button>
        </div>
      ) : !data.data.decks.length ? (
        <p className="text-sm text-muted-foreground">
          No imported deck data is available for this scope yet.
        </p>
      ) : (
        <TournamentMetaAnalyzer
          decks={data.data.decks}
          tournaments={data.data.tournaments}
          embedded={{
            settings: onChange ? value.settings : previewSettings,
            onChange: settings =>
              onChange ? onChange({ ...value, settings }) : setPreviewSettings(settings),
          }}
        />
      )}
    </section>
  );
}
