import { useState } from 'react';
import { useGetDeckCards } from '@/api/decks/useGetDeckCards.ts';
import { Link } from '@tanstack/react-router';
import { useUser } from '@/hooks/useUser';
import LoadingTitle from '../../global/LoadingTitle';
import { Button } from '@/components/ui/button.tsx';
import Error404 from '@/components/app/pages/error/Error404.tsx';
import EditDeckDialog from '../../dialogs/EditDeckDialog';
import DeleteDeckDialog from '../../dialogs/DeleteDeckDialog';
import DeckContents from '../DeckContents/DeckContents';
import { useSetDeckInfo } from '@/components/app/decks/DeckContents/useDeckInfoStore.ts';
import { Helmet } from 'react-helmet-async';
import { deckPrivacyRenderer } from '@/lib/table/deckPrivacyRenderer.tsx';
import OwnDeckComments from '../DeckDiscussion/OwnDeckComments.tsx';
import type { DeckDetailTab } from './deckDetailSearch.ts';
import {
  deckBuilderSourceLabels,
  getDeckBuilderDeckLink,
} from '../../../../../../types/DeckImport.ts';

interface DeckDetailProps {
  adminEdit?: boolean;
  deckId: string;
  deckbuilder?: boolean;
  embedded?: boolean;
  tab?: DeckDetailTab;
  onTabChange?: (tab: DeckDetailTab) => void;
  articleEditing?: boolean;
  onArticleEditingChange?: (editing: boolean) => void;
}

const DeckDetail: React.FC<DeckDetailProps> = ({
  adminEdit,
  deckId,
  deckbuilder,
  embedded = false,
  tab,
  onTabChange,
  articleEditing,
  onArticleEditingChange,
}) => {
  const user = useUser();
  const { data, loading, error, owned, deckUserId, refetch } = useSetDeckInfo(
    deckId,
    adminEdit,
    embedded,
  );
  const contents = useGetDeckCards(embedded ? deckId : undefined, embedded);
  const [resolvedDeckId, setResolvedDeckId] = useState<string>();
  if (
    embedded &&
    resolvedDeckId !== deckId &&
    !loading &&
    !contents.isFetching &&
    !error &&
    !contents.isError &&
    data &&
    contents.data
  )
    setResolvedDeckId(deckId);

  // Embedded details resolve fresh on opening, including access checks, while retaining
  // the ordinary deck actions and shared caches for user-initiated edits.
  if (embedded && (error || contents.isError)) {
    return (
      <div role="alert">
        <p>This deck is unavailable, or you do not have access to it.</p>
        <Button
          variant="outline"
          onClick={() => {
            void refetch();
            void contents.refetch();
          }}
        >
          Try again
        </Button>
      </div>
    );
  }
  if (
    embedded &&
    (!data || !contents.data || (resolvedDeckId !== deckId && (loading || contents.isFetching)))
  ) {
    return <p role="status">Loading decklist…</p>;
  }

  if (error?.status === 404) {
    return (
      <>
        <Helmet title="Deck not found | SWUBase" />
        <Error404
          title={`Deck not found`}
          description={`The deck you are looking for does not exist. It is possible that it was deleted or it is not public.`}
        />
        {!embedded && <OwnDeckComments key={deckId} deckId={deckId} />}
      </>
    );
  }

  if (deckbuilder && owned) {
    return (
      <div className="flex flex-1 flex-col gap-0 h-screen max-h-screen overflow-y-auto">
        <DeckContents deckId={deckId} deckbuilder />
      </div>
    );
  }

  return (
    <>
      {!embedded && <Helmet title={`${data?.deck.name || 'Loading deck'} | SWUBase`} />}
      <div className="flex max-lg:flex-col gap-4 items-center md:justify-between">
        <LoadingTitle
          mainTitle={data?.deck.name}
          subTitle={
            <>
              deck by{' '}
              <Link to={`/users/$userId`} params={{ userId: deckUserId }}>
                {data?.user.displayName}
              </Link>
            </>
          }
          loading={loading}
        />
        {user && (
          <div className="flex flex-row gap-4 items-center">
            {owned && data?.deck && (
              <>
                {deckPrivacyRenderer(data?.deck.public)}
                <EditDeckDialog deck={data?.deck} trigger={<Button>Edit deck</Button>} />
                <DeleteDeckDialog
                  deck={data?.deck}
                  trigger={<Button variant="destructive">Delete deck</Button>}
                />
              </>
            )}
          </div>
        )}
      </div>
      <div className="flex flex-row gap-4 text-sm italic mb-2">{data?.deck.description}</div>
      {data?.importSource && (
        <a
          className="mb-2 text-sm text-muted-foreground underline-offset-4 hover:underline"
          href={getDeckBuilderDeckLink(data.importSource.source, data.importSource.sourceDeckId)}
          target="_blank"
          rel="noreferrer"
        >
          Imported from {deckBuilderSourceLabels[data.importSource.source]}
        </a>
      )}
      <div className="min-w-0 grow">
        <DeckContents
          deckId={deckId}
          embedded={embedded}
          tab={tab}
          onTabChange={onTabChange}
          discussion={
            !embedded && !deckbuilder && data && !error
              ? {
                  ownerId: data.deck.userId,
                  editing: articleEditing ?? false,
                  onEditingChange: onArticleEditingChange,
                }
              : undefined
          }
        />
      </div>
    </>
  );
};

export default DeckDetail;
