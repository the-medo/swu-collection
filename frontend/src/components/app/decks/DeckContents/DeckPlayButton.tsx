import { useRole } from '@/hooks/useRole.ts';
import { Link } from '@tanstack/react-router';
import { CrossfireLogo } from '@/components/app/crossfire/CrossfireLogo.tsx';
import DeckGradientButton from './DeckImage/DeckGradientButton.tsx';

export default function DeckPlayButton({ deckId }: { deckId: string }) {
  const canCrossfire = useRole()('crossfire');
  if (!canCrossfire) return null;
  return (
    <DeckGradientButton
      deckId={deckId}
      variant="outline"
      className="border border-accent rounded-md"
      asChild
    >
      <Link to="/crossfire" search={previous => ({ ...previous, cfDeck: deckId })}>
        <CrossfireLogo />
        Play
      </Link>
    </DeckGradientButton>
  );
}
