import React from 'react';
import { CardGroup } from '@/components/app/limited/CardPoolDeckDetail/CPContent/cpDeckContentLib.ts';
import CPCardContentStack from '@/components/app/limited/CardPoolDeckDetail/CPContent/CPCardContentStack.tsx';
import { useGetUserSetting } from '@/api/user/useGetUserSetting.ts';

export interface CPCardContentBoxProps {
  group: CardGroup;
  className?: string;
}

const CPCardContentBox: React.FC<CPCardContentBoxProps> = ({ group, className }) => {
  const { data: imageSize } = useGetUserSetting('cpLayout_imageSize');

  return (
    <div className={`rounded-md border border-border bg-card p-2 ${className ?? ''}`}>
      <div className="text-sm font-semibold px-1">{group.title}</div>
      <div className="flex w-full overflow-x-auto gap-2">
        {group.cards.map(stack => (
          <CPCardContentStack
            key={stack.title}
            items={stack.cards}
            size={imageSize === 'big' ? 'w200' : 'w100'}
          />
        ))}
      </div>
    </div>
  );
};

export default CPCardContentBox;
