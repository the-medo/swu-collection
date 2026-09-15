import { useContext } from 'react';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button.tsx';
import { AbilityArt } from './AbilityArt.tsx';
import { GameCatalog } from './gameCatalog.ts';
import { triggerPresentation } from './abilityPresentation.ts';
import type { GameView, VisibleDecision } from '../../../../../play/view/types.ts';
export function AbilityChoice({
  option,
  view,
  pending,
  index,
  choose,
  highlight,
}: {
  option: VisibleDecision['options'][number];
  view: GameView;
  pending: boolean;
  index?: number;
  choose: () => void;
  highlight: (ids: string[]) => void;
}) {
  const catalog = useContext(GameCatalog);
  const { source, title, description } = triggerPresentation(option, view, catalog);
  const ids = [option.ability?.source.currentCardId, source?.currentCardId].filter(
    (id): id is string => !!id,
  );
  return (
    <Button
      type="button"
      variant="secondary"
      className="cf-ability-choice"
      disabled={pending}
      data-option-kind={option.kind}
      data-option-id={option.id}
      data-option-cards={option.cards.join(' ')}
      aria-label={`${title}${index ? ` ${index}` : ''} · ${source?.name ?? 'Ability'} · ${description}`}
      title={description}
      onClick={choose}
      onMouseEnter={() => highlight(ids)}
      onMouseLeave={() => highlight([])}
      onFocus={() => highlight(ids)}
      onBlur={() => highlight([])}
    >
      {source && <AbilityArt source={source} />}
      <span className="cf-ability-copy">
        <strong>
          {title}
          {index ? ` ${index}` : ''}
          <small>{source?.name}</small>
        </strong>
        <span>{description}</span>
      </span>
      <ArrowRight size={14} aria-hidden="true" />
    </Button>
  );
}
