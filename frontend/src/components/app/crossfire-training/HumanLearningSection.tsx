import type { TrainingStatus } from '../../../../../shared/types/crossfire-training.ts';
import { number } from './format.ts';
import { LabSection } from './LabPrimitives.tsx';
export default function HumanLearningSection({ data }: { data: TrainingStatus['humanLearning'] }) {
  return (
    <LabSection
      title="Learning from human games"
      description="Both players must opt in before a live Crossfire game can be used for training."
    >
      {data && (
        <dl className="mb-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          {[
            ['Training games', data.games],
            ['Decisions', data.decisions],
            ['Validation games', data.validationGames],
            ['Incompatible games skipped', data.skippedGames],
          ].map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs text-muted-foreground">{label}</dt>
              <dd className="mt-1 font-semibold tabular-nums">{number(Number(value))}</dd>
            </div>
          ))}
        </dl>
      )}
      <p className="text-sm leading-relaxed text-muted-foreground">
        Consented games are exported privately. The importer verifies each replay and reconstructs
        what each player could see. Whole matches stay together in separate training and evaluation
        sets. Importing games never changes production models automatically.
      </p>
    </LabSection>
  );
}
