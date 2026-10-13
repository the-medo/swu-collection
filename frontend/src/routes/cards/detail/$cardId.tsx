import { RelatedCreations } from '@/components/app/creators/CreationCards.tsx';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import CardDetail from '@/components/app/cards/CardDetail/CardDetail.tsx';
import { cardDetailSearchParams } from '@/components/app/cards/CardDetail/cardDetailSearchParams.ts';

export const Route = createFileRoute('/cards/detail/$cardId')({
  component: RouteComponent,
  validateSearch: cardDetailSearchParams,
});

function RouteComponent() {
  const { cardId } = Route.useParams();
  const { cardTab, cardVariantId, cardComment } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

  return (
    <>
      <CardDetail
        cardId={cardId}
        tab={cardTab ?? 'details'}
        variantId={cardVariantId}
        focusCommentId={cardComment}
        onTabChange={tab =>
          void navigate({
            search: previous => ({
              ...previous,
              cardTab: tab === 'details' ? undefined : tab,
              cardComment: tab === 'rules-discussion' ? previous.cardComment : undefined,
            }),
            resetScroll: false,
          })
        }
        onVariantChange={variantId =>
          void navigate({
            search: previous => ({ ...previous, cardVariantId: variantId }),
            resetScroll: false,
          })
        }
      />
      <RelatedCreations type="card" id={cardId} />
    </>
  );
}
