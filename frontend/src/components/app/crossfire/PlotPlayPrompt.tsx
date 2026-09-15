import { useState } from 'react';
import { Button } from '@/components/ui/button.tsx';
import { Switch } from '@/components/ui/switch.tsx';
import { FaceImage } from './GameCard.tsx';
import { cardActions, type CardAction } from './interaction.ts';
import type { VisibleDecision } from '../../../../../play/view/types.ts';

export function PlotPlayPrompt({
  decision,
  pending,
  activate,
  skip,
}: {
  decision: VisibleDecision;
  pending: boolean;
  activate: (action: CardAction) => void;
  skip: (optionId: string) => void;
}) {
  const [otherResources, setOtherResources] = useState(false);
  const source = decision.source!;
  const all = cardActions(decision, source.currentCardId ?? '').filter(
    a => a.option.kind === 'play',
  );
  const alternative = all.some(a => a.option.plot?.useOtherResources);
  const actions = all.filter(
    a => !!a.option.plot?.useOtherResources === (otherResources && alternative),
  );
  const decline = decision.options.find(o => o.kind === 'decline-effect');
  const costs = [
    ...new Set(actions.map(a => a.option.plot?.cost).filter((c): c is number => c !== undefined)),
  ];
  return (
    <section className="cf-prompt cf-plot-prompt" aria-label="Play a Plot card" aria-busy={pending}>
      <h2>{source.name} — Plot</h2>
      <div className="cf-plot-card">
        <FaceImage face={{ cardId: source.cardId, name: source.name, side: 'front' }} />
      </div>
      {costs.length > 0 && (
        <p className="cf-plot-cost">
          Cost: {Math.min(...costs)}
          {costs.length > 1 ? `–${Math.max(...costs)}` : ''}{' '}
          {costs.length === 1 && costs[0] === 1 ? 'resource' : 'resources'}
        </p>
      )}
      {alternative && (
        <div className="cf-plot-payment">
          <label>
            <Switch
              checked={otherResources}
              onCheckedChange={setOtherResources}
              disabled={pending}
              aria-label="Pay with other resources"
            />
            Pay with other resources
          </label>
          <small>Leave this Plot card ready while paying. Its replacement enters exhausted.</small>
        </div>
      )}
      {!actions.length && <p>This card cannot be played now.</p>}
      <div className="cf-plot-actions">
        {actions.map(action => (
          <Button
            key={action.key}
            className="cf-plot-play"
            data-option-id={action.option.id}
            data-option-kind="play"
            disabled={pending}
            onClick={() => activate(action)}
          >
            {action.option.piloting ? 'Play as a pilot' : 'Play'}
          </Button>
        ))}
        {decline && (
          <Button
            variant="outline"
            disabled={pending}
            data-option-id={decline.id}
            data-option-kind="decline-effect"
            onClick={() => skip(decline.id)}
          >
            Skip
          </Button>
        )}
      </div>
    </section>
  );
}
