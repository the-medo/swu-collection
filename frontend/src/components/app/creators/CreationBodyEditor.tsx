import { lazy, Suspense } from 'react';
import type { useCreationDraft } from './useCreationDraft.ts';
import { cn } from '@/lib/utils.ts';
import { CreationTemplatePicker } from './CreationTemplatePicker.tsx';
import './articleEditor.css';
const PostEditor = lazy(() => import('../rich-text-editor/blocknote/BlocknoteEditor.tsx'));
export function CreationBodyEditor({
  draft,
}: {
  draft: Pick<
    ReturnType<typeof useCreationDraft>,
    'document' | 'update' | 'generation' | 'setGeneration'
  >;
}) {
  const { document, update, generation, setGeneration } = draft;
  return (
    <div className={document.medium === 'article' ? 'article-editor' : undefined}>
      <CreationTemplatePicker
        document={document}
        onApply={patch => {
          update(patch);
          setGeneration(g => g + 1);
        }}
      />
      <div
        className={cn('min-h-72', document.medium !== 'article' && 'rounded-xl border bg-card p-4')}
      >
        <Suspense fallback={<p>Loading the SWU editor…</p>}>
          <PostEditor
            key={generation}
            type="rich"
            initialContent={document.body}
            onChange={body => update({ body })}
          />
        </Suspense>
      </div>
      <p className="text-xs text-muted-foreground">
        Use / to insert cards, decklists, matchups and tournament charts. Deck embeds show the
        current deck and respect its access settings.
      </p>
    </div>
  );
}
