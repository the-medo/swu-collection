import React from 'react';
import CardImage from '@/components/app/global/CardImage.tsx';
import { Button } from '@/components/ui/button.tsx';
import { useCardPoolDeckDetailStoreActions } from '../useCardPoolDeckDetailStore.ts';
import { useDeckLeaderAndBaseCards } from '@/hooks/useDeckLeaderAndBaseCards.ts';

export interface CPLeaderAndBaseCollapsedProps {
  deckId?: string;
  className?: string;
}

const CPLeaderAndBaseCollapsed: React.FC<CPLeaderAndBaseCollapsedProps> = ({
  deckId,
  className,
}) => {
  const { setLeadersAndBasesExpanded, setHoveredCardId } = useCardPoolDeckDetailStoreActions();
  const { leader, base, loading } = useDeckLeaderAndBaseCards(deckId);

  return (
    <div className={`flex items-center gap-2 ${className ?? ''}`}>
      {loading && <div className="text-xs opacity-60">Loading...</div>}
      {!loading && (
        <>
          <div className="flex items-center gap-2">
            {leader && (
              <div className="rounded-md" onMouseEnter={() => setHoveredCardId(leader.id)}>
                <CardImage
                  card={leader.card}
                  cardVariantId={leader.cardVariantId}
                  forceHorizontal={true}
                  size="w100"
                />
              </div>
            )}
            {base && (
              <div className="rounded-md" onMouseEnter={() => setHoveredCardId(base.id)}>
                <CardImage
                  card={base.card}
                  cardVariantId={base.cardVariantId}
                  forceHorizontal={true}
                  size="w100"
                />
              </div>
            )}
          </div>
          <Button
            size="sm"
            variant="outline"
            className="ml-2"
            onClick={() => setLeadersAndBasesExpanded(true)}
          >
            Change
          </Button>
        </>
      )}
    </div>
  );
};

export default CPLeaderAndBaseCollapsed;
