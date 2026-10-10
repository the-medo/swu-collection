import { lazy, Suspense } from 'react';
import { ArrowRight, BookOpen, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button.tsx';
import { Card, CardContent, CardHeader } from '@/components/ui/card.tsx';
import { useUser } from '@/hooks/useUser.ts';
import { getDeckArticle, useGetDeckArticle } from '@/api/decks/useGetDeckArticle.ts';
import { useSaveDeckArticle } from '@/api/decks/useSaveDeckArticle.ts';
import { isPostEmpty } from '../../../../../../shared/posts/content.ts';
import DeckPostForm from './DeckPostForm.tsx';

const PostContent = lazy(() =>
  import('../../rich-text-editor/blocknote/BlocknoteEditor.tsx').then(module => ({
    default: module.PostContent,
  })),
);

export default function DeckArticle({
  deckId,
  ownerId,
  editing = false,
  onEditingChange,
}: {
  deckId: string;
  ownerId: string;
  editing?: boolean;
  onEditingChange?: (editing: boolean) => void;
}) {
  const user = useUser();
  const owned = user?.id === ownerId;
  const query = useGetDeckArticle(deckId);
  const save = useSaveDeckArticle(deckId);
  const empty = !query.data || isPostEmpty(query.data.content);
  if (!owned && !query.isPending && !query.isError && empty) return null;
  const invitation = owned && empty && !editing && !query.isPending && !query.isError;
  const editingArticle = owned && editing && !query.isPending && query.data !== undefined;
  return (
    <section aria-label="Deck guide" className="min-w-0">
      {invitation ? (
        <Card className="@container/article rounded-xl border-primary/20 bg-primary/5 shadow-none">
          <CardContent className="flex flex-col gap-4 p-5 @[600px]/article:flex-row @[600px]/article:items-center sm:p-6">
            <div className="flex min-w-0 flex-1 items-start gap-4">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/15">
                <BookOpen aria-hidden="true" className="size-5" />
              </div>
              <div className="min-w-0 space-y-1">
                <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Deck guide
                </p>
                <h3 className="mb-0! text-lg!">Share your game plan</h3>
                <p className="text-sm leading-6! text-muted-foreground">
                  Bring this deck to life with your strategy, matchups, and card choices.
                </p>
              </div>
            </div>
            <Button
              className="self-start @[600px]/article:self-center"
              onClick={() => onEditingChange?.(true)}
            >
              <Pencil aria-hidden="true" />
              Write guide
              <ArrowRight aria-hidden="true" />
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="min-w-0 rounded-xl shadow-none">
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0 border-b px-5 py-4 sm:px-7">
            <div className="flex items-center gap-3">
              <BookOpen aria-hidden="true" className="size-5 text-muted-foreground" />
              <h3 className="mb-0! text-lg!">
                {editingArticle ? (empty ? 'Write your guide' : 'Edit guide') : 'Guide'}
              </h3>
            </div>
            {owned && !editing && !query.isPending && !query.isError && (
              <Button variant="ghost" size="sm" onClick={() => onEditingChange?.(true)}>
                <Pencil aria-hidden="true" />
                Edit guide
              </Button>
            )}
          </CardHeader>
          <CardContent className="min-w-0 p-5 sm:p-7">
            {query.isPending ? (
              <p role="status" className="text-sm text-muted-foreground">
                Loading guide…
              </p>
            ) : owned && editing && query.data !== undefined ? (
              <DeckPostForm
                type="rich"
                documentLabel="guide"
                initialPost={query.data}
                submitLabel="Save guide"
                busy={save.isPending}
                onSave={(content, revision) => save.mutateAsync({ content, revision })}
                getLatest={() => getDeckArticle(deckId)}
                onClose={() => onEditingChange?.(false)}
              />
            ) : query.isError ? (
              <div role="alert" className="space-y-2 text-sm">
                <p>{query.error.message}</p>
                <Button variant="outline" size="sm" onClick={() => void query.refetch()}>
                  Try again
                </Button>
              </div>
            ) : (
              <div className="mx-auto min-w-0 max-w-3xl [&_.rte-published_.bn-block-content]:px-0! [&_.rte-published_.bn-editor]:bg-transparent!">
                <Suspense fallback={<p role="status">Loading guide…</p>}>
                  <PostContent
                    type="rich"
                    key={`${deckId}:${query.data!.revision}`}
                    content={query.data!.content}
                  />
                </Suspense>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </section>
  );
}
