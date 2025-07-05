import * as React from 'react';
import { useSearch, Link, useNavigate } from '@tanstack/react-router';
import { cn } from '@/lib/utils';
import LeaderSelector from '@/components/app/global/LeaderSelector/LeaderSelector.tsx';
import BaseSelector from '@/components/app/global/BaseSelector/BaseSelector.tsx';
import { Route } from '@/routes/__root.tsx';
import { useCallback } from 'react';
import { useCardList } from '@/api/lists/useCardList.ts';
import { isAspect } from '@/lib/cards/isAspect.ts';
import { basicBaseForAspect } from '../../../../../../shared/lib/basicBases.ts';
import { SwuAspect } from '../../../../../../types/enums.ts';
import { isBasicBase } from '../../../../../../shared/lib/isBasicBase.ts';
import { CardImageVariantProps } from '@/components/app/global/CardImage.tsx';

interface LeaderBaseStatSelectorProps {
  className?: string;
  type?: 'main' | 'secondary';
  size?: CardImageVariantProps['size'];
}

const LeaderBaseStatSelector: React.FC<LeaderBaseStatSelectorProps> = ({
  className,
  type = 'main',
  size = 'w300',
}) => {
  const { csLeaderId, csBaseId, csLeaderId2, csBaseId2 } = useSearch({ strict: false });
  const navigate = useNavigate({ from: Route.fullPath });
  const { data: cardListData } = useCardList();

  // Determine which URL parameters to use based on type
  const leaderId = type === 'main' ? csLeaderId : csLeaderId2;
  const baseId = type === 'main' ? csBaseId : csBaseId2;
  const leaderUrlParam = type === 'main' ? 'csLeaderId' : 'csLeaderId2';
  const baseUrlParam = type === 'main' ? 'csBaseId' : 'csBaseId2';

  const onBaseSelected = useCallback(
    (baseId: string | undefined) => {
      if (baseId) {
        const baseCard = cardListData?.cards[baseId];
        if (baseCard && isBasicBase(baseCard)) {
          baseId = baseCard.aspects[0];
        }
      }

      navigate({
        search: prev => ({
          ...prev,
          [baseUrlParam]: baseId,
        }),
      });
    },
    [cardListData, baseUrlParam],
  );

  return (
    <div className={cn('flex gap-4 items-start', className)}>
      <div className="flex flex-col gap-2">
        <LeaderSelector
          trigger={null}
          leaderCardId={leaderId}
          onLeaderSelected={leaderId => {
            navigate({
              search: prev => ({
                ...prev,
                [leaderUrlParam]: leaderId,
              }),
            });
          }}
          size={size}
        />
        <Link
          to="."
          search={prev => ({ ...prev, [leaderUrlParam]: undefined })}
          className={cn(
            'text-sm text-muted-foreground hover:text-foreground',
            !leaderId && 'hidden',
          )}
        >
          Clear leader
        </Link>
      </div>
      <div className="flex flex-col gap-2">
        <BaseSelector
          trigger={null}
          baseCardId={isAspect(baseId) ? basicBaseForAspect[baseId as SwuAspect] : baseId}
          onBaseSelected={onBaseSelected}
          size={size}
        />
        <Link
          to="."
          search={prev => ({ ...prev, [baseUrlParam]: undefined })}
          className={cn('text-sm text-muted-foreground hover:text-foreground', !baseId && 'hidden')}
        >
          Clear base
        </Link>
      </div>
    </div>
  );
};

export default LeaderBaseStatSelector;
