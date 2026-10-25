import { crossfireHomeStyles as styles } from './crossfireHomeStyles.ts';
import { DeckPicker } from '@/components/app/global/DeckPicker/DeckPicker.tsx';
import { DeckPickerRow } from '@/components/app/global/DeckPicker/DeckPickerRow.tsx';
import type { CrossfireDeckSummary } from '../../../../../shared/types/crossfire-decks.ts';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils.ts';

export function DeckBrowser(props: {
  sessionId: string;
  selected?: string;
  disabled: boolean;
  onSelect: (id: string) => void;
  linked: boolean;
  selectedDeck?: CrossfireDeckSummary;
  selectedStatus: string;
  onSelectLink: (id: string) => void;
  invitationStep?: 'choose' | 'checking' | 'error' | 'attention' | 'complete';
}) {
  const active = props.invitationStep && props.invitationStep !== 'complete';
  return (
    <div className={cn(styles.picker, active && 'bg-primary/5 ring-2 ring-inset ring-primary/50')}>
      <div
        className="cf-deck-picker-heading flex items-center gap-3"
        aria-current={active ? 'step' : undefined}
      >
        {props.invitationStep && (
          <span
            className={cn(
              styles.stepBadge,
              active
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-primary/30 bg-primary/10 text-primary',
            )}
            aria-hidden
          >
            {props.invitationStep === 'complete' ? <Check className="size-4" /> : '1'}
          </span>
        )}
        <div>
          <h2 className={styles.heading}>Choose your deck</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {props.invitationStep === 'choose'
              ? 'Start here. Pick a deck for this matchup.'
              : props.invitationStep === 'checking'
                ? 'Checking your selected deck…'
                : props.invitationStep === 'error'
                  ? 'Couldn’t check this deck. Try again or choose another.'
                  : props.invitationStep === 'attention'
                    ? 'Check the deck details or choose another deck.'
                    : props.invitationStep === 'complete'
                      ? 'Deck selected. You can still change your choice.'
                      : 'Bring your own build or try a community deck.'}
          </p>
        </div>
      </div>
      <DeckPicker
        fillHeight
        crossfireSessionId={props.sessionId}
        selected={props.selected}
        disabled={props.disabled}
        onSelect={props.onSelect}
        onSelectLink={props.onSelectLink}
      />
      {props.linked && (
        <div className="cf-linked-deck shrink-0" aria-label="Selected linked deck">
          {props.selectedDeck ? (
            <DeckPickerRow
              deck={props.selectedDeck}
              selected
              disabled={props.disabled}
              onSelect={props.onSelectLink}
            />
          ) : (
            <p role="status" className="p-3 text-xs text-muted-foreground">
              {props.selectedStatus}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
