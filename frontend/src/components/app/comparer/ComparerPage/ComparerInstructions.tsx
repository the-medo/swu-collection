import { Layers, Crown, Scale } from 'lucide-react';
import { workspaceStyles } from '@/components/app/global/WorkspacePage/workspaceStyles.ts';

const steps = [
  {
    icon: Layers,
    title: 'Add items',
    text: 'Use “Add to comparer” on a deck, collection, wantlist or card list.',
  },
  {
    icon: Crown,
    title: 'Choose your main item',
    text: 'Use the crown button in Selected items. Everything else is compared against this item.',
  },
  {
    icon: Scale,
    title: 'Explore the differences',
    text: 'Compare deck quantities and switch table views, or see which cards your lists have in common.',
  },
];

export default function ComparerInstructions() {
  return (
    <div className="space-y-3 text-sm">
      <h2 className={workspaceStyles.heading}>How it works</h2>
      {steps.map(({ icon: Icon, title, text }) => (
        <div key={title} className="flex items-start gap-2.5">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-[var(--workspace-soft)] text-[var(--workspace-accent)]">
            <Icon className="size-3.5" />
          </span>
          <div>
            <p className="font-medium">{title}</p>
            <p className="text-xs leading-relaxed text-muted-foreground">{text}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
