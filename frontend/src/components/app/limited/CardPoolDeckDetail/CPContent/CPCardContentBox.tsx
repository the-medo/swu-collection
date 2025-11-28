import React, { useMemo } from 'react';
import { CardGroup } from '@/components/app/limited/CardPoolDeckDetail/CPContent/cpDeckContentLib.ts';
import CPCardContentStack from '@/components/app/limited/CardPoolDeckDetail/CPContent/CPCardContentStack.tsx';
import { useGetUserSetting } from '@/api/user/useGetUserSetting.ts';
import CPMultiCardSelectActions from '@/components/app/limited/CardPoolDeckDetail/CPContent/CPMultiCardSelectActions.tsx';

export interface CPCardContentBoxProps {
  group: CardGroup;
  className?: string;
}

const CPCardContentBox: React.FC<CPCardContentBoxProps> = ({ group, className }) => {
  const { data: imageSize } = useGetUserSetting('cpLayout_imageSize');
  const { data: displayBoxTitles } = useGetUserSetting('cpLayout_displayBoxTitles');
  const { data: displayStackTitles } = useGetUserSetting('cpLayout_displayStackTitles');

  const { nonEmptyStacks, cards } = useMemo(() => {
    const stacks = group.cards.filter(stack => stack.cards && stack.cards.length > 0);
    const cards = stacks.flatMap(stack => stack.cards ?? []);
    return { nonEmptyStacks: stacks, cards: cards };
  }, [group]);
  if (nonEmptyStacks.length === 0) return null;

  return (
    <div className={`rounded-md border border-border bg-card p-2 ${className ?? ''}`}>
      {/* Header with optional title and always-visible multi-select actions */}
      <div className="flex items-center justify-between px-1 gap-2 border-b border-border pb-1 mb-2">
        {displayBoxTitles ? <div className="font-semibold">{group.title}</div> : null}
        <CPMultiCardSelectActions cards={cards} />
      </div>
      <div className="flex w-full overflow-x-auto gap-2">
        {nonEmptyStacks.map(stack => (
          <CPCardContentStack
            key={stack.title}
            items={stack.cards}
            size={imageSize === 'big' ? 'w200' : 'w100'}
            title={stack.title}
            showTitle={!!displayStackTitles}
          />
        ))}
      </div>
    </div>
  );
};

export default CPCardContentBox;
