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

interface DeckDetailProps {
  adminEdit?: boolean;
  deckId: string;
  deckbuilder?: boolean;
}

const DeckDetail: React.FC<DeckDetailProps> = ({ adminEdit, deckId, deckbuilder }) => {
  const user = useUser();
  const { data, loading, error, owned, deckUserId } = useSetDeckInfo(deckId, adminEdit);

  if (error?.status === 404) {
    return (
      <>
        <Helmet title="Deck not found | SWUBase" />
        <Error404
          title={`Deck not found`}
          description={`The deck you are looking for does not exist. It is possible that it was deleted or it is not public.`}
        />
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
      <Helmet title={`${data?.deck.name || 'Loading deck'} | SWUBase`} />
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
      <div className="flex grow flex-col gap-0">
        <DeckContents deckId={deckId} />
      </div>
    </>
  );
};

export default DeckDetail;
