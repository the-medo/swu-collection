import { Button } from '@/components/ui/button.tsx';
import LeaderSelector from '@/components/app/global/LeaderSelector/LeaderSelector.tsx';
import { useCardList } from '@/api/lists/useCardList.ts';

export function ContentLeaderPicker({
  value,
  onChange,
}: {
  value?: string;
  onChange: (id: string | undefined) => void;
}) {
  const { data } = useCardList();
  const card = value ? data?.cards[value] : undefined;
  return (
    <LeaderSelector
      leaderCardId={value}
      onLeaderSelected={onChange}
      trigger={
        <Button
          type="button"
          variant="outline"
          className="h-auto min-h-10 w-full whitespace-normal text-left"
          aria-label="Choose leader"
        >
          {card ? `${card.name}${card.subtitle ? ` — ${card.subtitle}` : ''}` : 'Choose leader'}
        </Button>
      }
    />
  );
}
