// Served only by browser tests; no production route or saved drafts.
import '../src/styles/index.css';
import '../src/styles/typography.css';
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
import { queryClient } from '../src/queryClient';
import { CreationBodyEditor } from '../src/components/app/creators/CreationBodyEditor';
import { Input } from '../src/components/ui/input';
import { Button } from '../src/components/ui/button';
import { PostContent } from '../src/components/app/rich-text-editor/blocknote/PostContent';
import { creationDocumentSchema, type CreationDocument } from '../../shared/creators/contracts';
import { emptyPostDocument } from '../../shared/posts/content';

declare global {
  interface Window {
    articleTemplateFixtureDocument: CreationDocument;
  }
}
export function TemplateFixture() {
  const [document, setDocument] = useState(() => ({
    ...creationDocumentSchema.parse({
      title: 'Fixture',
      medium: 'article',
      body: emptyPostDocument(),
      tags: [],
      references: [],
      chapters: [],
    }),
    title: '',
  }));
  const [generation, setGeneration] = useState(0);
  const [preview, setPreview] = useState(false);
  useEffect(() => {
    window.articleTemplateFixtureDocument = document;
  }, [document]);
  return (
    <section
      aria-label="Template editor fixture"
      className="mx-auto w-full min-w-0 max-w-4xl p-4 sm:p-8"
    >
      <Input
        aria-label="Article title"
        value={document.title}
        onChange={event => setDocument(previous => ({ ...previous, title: event.target.value }))}
        className="mb-4"
      />
      <Button className="mb-4" onClick={() => setPreview(value => !value)}>
        {preview ? 'Return to editor' : 'Preview article'}
      </Button>
      {preview ? (
        <PostContent type="rich" content={document.body!} />
      ) : (
        <CreationBodyEditor
          draft={{
            document,
            generation,
            setGeneration,
            update: patch => setDocument(previous => ({ ...previous, ...patch })),
          }}
        />
      )}
    </section>
  );
}
ProfileRoute.update({ component: TemplateFixture });
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
