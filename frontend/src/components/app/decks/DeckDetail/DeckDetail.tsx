import { getRouteApi, Link } from '@tanstack/react-router';
import { useUser } from '@/hooks/useUser';
import LoadingTitle from '../../global/LoadingTitle';
import { Button } from '@/components/ui/button.tsx';
import { publicRenderer } from '@/lib/table/publicRenderer.tsx';
import Error404 from '@/components/app/pages/error/Error404.tsx';
import { useGetDeck } from '@/api/decks/useGetDeck';
import { usePostDeckFavorite } from '@/api/decks/usePostDeckFavorite';
import EditDeckDialog from '../../dialogs/EditDeckDialog';
import DeleteDeckDialog from '../../dialogs/DeleteDeckDialog';
import DeckContents from '../DeckContents/DeckContents';
import { useDeckLayoutStoreActions } from '@/components/app/decks/DeckContents/useDeckLayoutStore.ts';
import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Star } from 'lucide-react';

const routeApi = getRouteApi('/decks/$deckId/');

const DeckDetail: React.FC = () => {
  const user = useUser();
  const [isFavorite, setIsFavorite] = useState(false);

  const { deckId } = routeApi.useParams();
  const { data, isFetching, error } = useGetDeck(deckId);
  const { setDeckInfo } = useDeckLayoutStoreActions();
  const favoriteDecMutation = usePostDeckFavorite(deckId);

  const deckUserId = data?.user?.id ?? '';
  const loading = isFetching;
  const format = data?.deck.format ?? 1;
  const owned = user?.id === deckUserId;

  useEffect(() => {
    setDeckInfo(deckId, format, owned);
  }, [deckId, format, owned]);

  const handleFavoriteClick = () => {
    if (!user) return; // User must be logged in to favorite

    setIsFavorite(prev => !prev); // Optimistically update UI
    favoriteDecMutation.mutate({ isFavorite: !isFavorite });
  };

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
                {publicRenderer(data?.deck.public)}
                <EditDeckDialog deck={data?.deck} trigger={<Button>Edit deck</Button>} />
                <DeleteDeckDialog
                  deck={data?.deck}
                  trigger={<Button variant="destructive">Delete deck</Button>}
                />
              </>
            )}
            <Button
              variant={isFavorite ? "default" : "outline"}
              size="icon"
              onClick={handleFavoriteClick}
              title={isFavorite ? "Unfavorite this deck" : "Favorite this deck"}
            >
              <Star className={isFavorite ? "fill-current" : ""} />
            </Button>
          </div>
        )}
      </div>
      <div className="flex flex-row gap-4 text-sm italic mb-2">{data?.deck.description}</div>
      <div className="flex flex-grow flex-row gap-4">
        <DeckContents deckId={deckId} />
      </div>
    </>
  );
};

export default DeckDetail;