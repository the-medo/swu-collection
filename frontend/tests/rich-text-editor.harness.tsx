// Browser-only fixture, served by Vite when Playwright supplies the test HTML.
// Reuses the application providers/routes without adding a production test page.
import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { createRouter, RouterProvider } from '@tanstack/react-router';
import { HelmetProvider } from 'react-helmet-async';
import { routeTree } from '../src/routeTree.gen';
import { Route as ProfileRoute } from '../src/routes/users/$userId/index';
import { ThemeProvider } from '../src/components/theme-provider';
import { DatabaseProvider } from '../src/providers/DatabaseProvider';
import { TooltipProvider } from '../src/components/ui/tooltip';
import { Button } from '../src/components/ui/button';
import { queryClient } from '../src/queryClient';
import PostEditor, {
  PostContent,
} from '../src/components/app/rich-text-editor/blocknote/BlocknoteEditor';
import { emptyPostDocument, type PostDocument } from '../../shared/posts/content';
import '../src/styles/index.css';
import '../src/styles/typography.css';

declare global {
  interface Window {
    editorFixtureInitialContent?: PostDocument;
    editorFixtureDocument: PostDocument;
  }
}

export function RichEditorFixture() {
  const [content, setContent] = useState(
    () => window.editorFixtureInitialContent ?? emptyPostDocument(),
  );
  const [published, setPublished] = useState(!!window.editorFixtureInitialContent);
  useEffect(() => {
    window.editorFixtureDocument = content;
  }, [content]);
  return (
    <section aria-label="Post preview">
      <h2>Rich editor fixture</h2>
      {published ? (
        <PostContent type="rich" content={content} />
      ) : (
        <>
          <PostEditor type="rich" initialContent={content} onChange={setContent} />
          <Button onClick={() => setPublished(true)}>Preview post</Button>
        </>
      )}
    </section>
  );
}

ProfileRoute.update({ component: RichEditorFixture });
const router = createRouter({ routeTree });
createRoot(document.getElementById('root')!).render(
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <DatabaseProvider>
        <HelmetProvider>
          <TooltipProvider>
            <RouterProvider router={router} />
          </TooltipProvider>
        </HelmetProvider>
      </DatabaseProvider>
    </ThemeProvider>
  </QueryClientProvider>,
);
