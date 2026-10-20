// Browser-only fixture served by editor-pools.browser.ts.
import '../src/styles/index.css';
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createRootRoute, createRouter, RouterProvider } from '@tanstack/react-router';
import { ThemeProvider, useTheme } from '../src/components/theme-provider.tsx';
import PostEditor from '../src/components/app/rich-text-editor/blocknote/BlocknoteEditor.tsx';
import { PostContent } from '../src/components/app/rich-text-editor/blocknote/PostContent.tsx';
import type { CardListResponse } from '../src/api/lists/useCardList.ts';
import { emptyPostDocument, type PostDocument } from '../../shared/posts/content.ts';

declare global {
  interface Window {
    poolFixtureCards: CardListResponse['cards'];
    poolFixtureInitial?: PostDocument;
    poolFixtureDocument: PostDocument;
    refreshPoolWidgets: () => Promise<void>;
  }
}
const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
const cards = window.poolFixtureCards;
client.setQueryData<CardListResponse>(['cardList'], {
  cards,
  cardIds: Object.keys(cards),
  cardsByCardNo: {},
  cardsByCardType: { Leader: cards },
  allTraits: new Set(),
  allKeywords: new Set(),
  allVariants: new Set(),
});
window.refreshPoolWidgets = () => client.invalidateQueries({ queryKey: ['editor-pool'] });

export function PoolEditorFixture() {
  const [document, setDocument] = useState(() => window.poolFixtureInitial ?? emptyPostDocument());
  const [published, setPublished] = useState(!!window.poolFixtureInitial);
  const { setTheme } = useTheme();
  return (
    <main className="mx-auto w-full max-w-3xl p-3 sm:p-5">
      <div className="mb-4 flex gap-4">
        <button onClick={() => setPublished(true)}>Preview article</button>
        <button onClick={() => setTheme('light')}>Light</button>
        <button onClick={() => setTheme('dark')}>Dark</button>
      </div>
      {published ? (
        <PostContent type="rich" content={document} />
      ) : (
        <PostEditor
          ariaLabel="Article content"
          type="rich"
          initialContent={document}
          onChange={next => {
            setDocument(next);
            window.poolFixtureDocument = next;
          }}
        />
      )}
    </main>
  );
}
const rootRoute = createRootRoute({ component: PoolEditorFixture });
const router = createRouter({ routeTree: rootRoute });
createRoot(document.getElementById('root')!).render(
  <QueryClientProvider client={client}>
    <ThemeProvider defaultTheme="light">
      <RouterProvider router={router} />
    </ThemeProvider>
  </QueryClientProvider>,
);
