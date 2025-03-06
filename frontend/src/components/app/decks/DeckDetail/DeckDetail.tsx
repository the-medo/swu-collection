import { getRouteApi, Link } from '@tanstack/react-router';
import { useUser } from '@/hooks/useUser';
import LoadingTitle from '../../global/LoadingTitle';
import { Button } from '@/components/ui/button.tsx';
import { publicRenderer } from '@/lib/table/publicRenderer.tsx';
import Error404 from '@/components/app/pages/error/Error404.tsx';
import { useGetDeck } from '@/api/decks/useGetDeck';
import EditDeckDialog from '../../dialogs/EditDeckDialog';
import DeleteDeckDialog from '../../dialogs/DeleteDeckDialog';
import DeckContents from '../DeckContents/DeckContents';
import DeckActions from '@/components/app/decks/DeckActions/DeckActions.tsx';

const routeApi = getRouteApi('/decks/$deckId/');

const DeckDetail: React.FC = () => {
  const user = useUser();
  const { deckId } = routeApi.useParams();
  const { data, isFetching, error } = useGetDeck(deckId);

  const deckUserId = data?.user?.id ?? '';
  const loading = isFetching;
  const owned = user?.id === deckUserId;

  if (error?.status === 404) {
    return (
      <Error404
        title={`Deck not found`}
        description={`The deck you are looking for does not exist. It is possible that it was deleted or it is not public.`}
      />
    );
  }

  return (
    <>
      <div className="flex flex-row gap-4 items-center justify-between">
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
        {owned && data?.deck && (
          <div className="flex flex-row gap-4 items-center">
            {publicRenderer(data?.deck.public)}
            <EditDeckDialog deck={data?.deck} trigger={<Button>Edit deck</Button>} />
            <DeleteDeckDialog
              deck={data?.deck}
              trigger={<Button variant="destructive">Delete deck</Button>}
            />
          </div>
        )}
      </div>
      <div className="flex flex-row gap-4 text-sm italic mb-2">{data?.deck.description}</div>
      <div className="flex flex-grow flex-row gap-4">
        <DeckContents deckId={deckId} />
        {/*<div className="flex flex-col gap-4 w-[400px]">
          <DeckActions deckId={deckId} />
        </div>*/}
      </div>
    </>
  );
};

export default DeckDetail;
