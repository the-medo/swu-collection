import React from 'react';
import {
  CardGroup,
  ExpandedCardData,
} from '@/components/app/limited/CardPoolDeckDetail/CPContent/cpDeckContentLib.ts';
import CPCardContentBox from '@/components/app/limited/CardPoolDeckDetail/CPContent/CPCardContentBox.tsx';
import { useGetUserSetting } from '@/api/user/useGetUserSetting.ts';
import { cn } from '@/lib/utils.ts';
import { useUser } from '@/hooks/useUser.ts';

export interface CPCardContentProps {
  pool?: { cards: ExpandedCardData[]; boxes: CardGroup[] };
  className?: string;
}

const CPCardContent: React.FC<CPCardContentProps> = ({ pool, className }) => {
  const user = useUser();
  const disabled = !user;
  const { data: boxLayout } = useGetUserSetting('cpLayout_boxLayout');
  return (
    <div className={`h-full ${className ?? ''}`}>
      <div className={cn(`flex flex-1 gap-2`, { 'flex-wrap': boxLayout === 'grid' })}>
        {pool?.boxes?.map(group => (
          <CPCardContentBox key={group.title} group={group} disabled={disabled} />
        ))}
      </div>
    </div>
  );
};

export default CPCardContent;
