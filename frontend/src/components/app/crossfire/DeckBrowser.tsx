import { DeckPicker } from '@/components/app/global/DeckPicker/DeckPicker.tsx';
import { DeckPickerRow } from '@/components/app/global/DeckPicker/DeckPickerRow.tsx';
import type { CrossfireDeckSummary } from '../../../../../shared/types/crossfire-decks.ts';

export function DeckBrowser(props: {
  sessionId: string;
  selected?: string;
  disabled: boolean;
  onSelect: (id: string) => void;
  linked: boolean;
  selectedDeck?: CrossfireDeckSummary;
  selectedStatus: string;
  onSelectLink: (id: string) => void;
}) {
  return (
    <div className="cf-deck-picker gap-3">
      <div className="cf-deck-picker-heading">
        <h2>Choose your deck</h2>
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
        <div className="shrink-0" aria-label="Selected linked deck">
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
