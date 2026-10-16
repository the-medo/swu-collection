import { MatchupPicker } from './MatchupPicker.tsx';
import { MetaAnalysisPicker } from './MetaAnalysisPicker.tsx';
import { CardGroupPicker } from './CardGroupPicker.tsx';
import { CalloutPicker } from './CalloutPicker.tsx';
import type { Widget } from './model.ts';

export function WidgetPicker({
  kind,
  initial,
  onSelect,
}: {
  kind: Widget['kind'];
  initial?: Widget;
  onSelect: (value: Widget) => void;
}) {
  switch (kind) {
    case 'matchup':
      return (
        <MatchupPicker initial={initial?.kind === kind ? initial : undefined} onSelect={onSelect} />
      );
    case 'meta-analysis':
      return (
        <MetaAnalysisPicker
          initial={initial?.kind === kind ? initial : undefined}
          onSelect={onSelect}
        />
      );
    case 'card-group':
      return (
        <CardGroupPicker
          initial={initial?.kind === kind ? initial : undefined}
          onSelect={onSelect}
        />
      );
    case 'callout':
      return (
        <CalloutPicker initial={initial?.kind === kind ? initial : undefined} onSelect={onSelect} />
      );
  }
}
