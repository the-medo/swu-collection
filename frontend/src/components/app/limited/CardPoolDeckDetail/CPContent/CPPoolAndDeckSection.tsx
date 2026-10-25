import { limitedStyles } from '@/components/app/limited/limitedStyles';
import CPCardContent from './CPCardContent.tsx';
import CPDeckAndTrashCard from './CPDeckAndTrashCard.tsx';
import CPSelectionAction from './CPSelectionAction.tsx';
import { useCPDeckContent } from './useCPDeckContent.ts';

export interface CPPoolAndDeckSectionProps {
  deckId?: string;
  poolId?: string;
}

export default function CPPoolAndDeckSection({ deckId, poolId }: CPPoolAndDeckSectionProps) {
  const data = useCPDeckContent(deckId, poolId);
  return (
    <div className={limitedStyles.builderCards}>
      <div className="flex min-h-0 min-w-0 flex-col gap-2">
        <div className="min-h-0 min-w-0 flex-1 overflow-auto max-lg:max-h-[65dvh]">
          <CPCardContent pool={data?.pool} />
        </div>
        <CPSelectionAction poolId={poolId} deckId={deckId} />
      </div>
      <div className="min-h-0 min-w-0 overflow-y-auto">
        <CPDeckAndTrashCard deck={data?.deck} trash={data?.trash} poolId={poolId} deckId={deckId} />
      </div>
    </div>
  );
}
