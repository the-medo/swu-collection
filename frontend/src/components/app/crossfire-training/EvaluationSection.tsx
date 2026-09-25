import { useState } from 'react';
import type { TrainingDeckOption } from '../../../../../shared/types/crossfire-training.ts';
import type { EvaluationReport } from './lab-data.ts';
import { fraction, percent } from './format.ts';
import {
  ComparisonTable,
  EmptyState,
  fieldClass,
  LabSection,
  ModelHash,
} from './LabPrimitives.tsx';
import WinRateChart from './WinRateChart.tsx';

export default function EvaluationSection({
  reports,
  decks,
  deck,
  opponent,
  onOpponent,
  rotation,
}: {
  reports: EvaluationReport[];
  decks: readonly TrainingDeckOption[];
  deck: string;
  opponent: string;
  onOpponent: (key: string) => void;
  rotation: boolean;
}) {
  const [selectedId, setSelectedId] = useState<string>();
  const selected = reports.find(r => r.id === selectedId) ?? reports[reports.length - 1];
  const name = (key: string) => decks.find(d => d.key === key)?.short ?? key;
  const rows = selected
    ? decks
        .filter(d => selected.before[d.key] || selected.after[d.key])
        .map(d => ({
          id: d.key,
          label: `${name(d.key)}${d.key === deck ? ' · policy mirror' : ''}`,
          before: selected.before[d.key],
          after: selected.after[d.key],
          comparable: selected.comparable,
        }))
    : [];
  const points = reports.map(r => ({
    id: r.id,
    label: r.label,
    score: r.after[opponent] ?? null,
    modelHash: r.afterHash,
  }));
  return (
    <LabSection
      title={`${name(deck)} · fixed-opponent evaluation`}
      description={
        rotation
          ? 'Before and after each practice refresher: the same 50 seeds played from both seats against the fixed initial specialists. These development measurements remain separate from stochastic training games.'
          : 'Full-game development checks against the unchanged reference model, using the same paired seeds. These measurements remain separate from training-game win rates.'
      }
      actions={
        !!reports.length && (
          <label className="flex items-center gap-2 text-sm">
            Checkpoint
            <select
              className={fieldClass}
              aria-label="Evaluation checkpoint"
              value={selected?.id}
              onChange={e => setSelectedId(e.target.value)}
            >
              {[...reports].reverse().map(r => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
          </label>
        )
      }
    >
      {!selected ? (
        <EmptyState>
          {rotation
            ? 'The first comparison appears after this deck completes its full-game turn, both evaluations, and the practice refresher.'
            : 'Completed fixed-opponent evaluations will appear here.'}
        </EmptyState>
      ) : (
        <div className="space-y-5">
          <ComparisonTable
            rows={rows}
            beforeLabel={selected.beforeLabel}
            afterLabel={selected.afterLabel}
            label="Fixed-opponent comparison"
            onSelect={onOpponent}
          />
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            Compared models: <ModelHash hash={selected.beforeHash} />
            <span>→</span>
            <ModelHash hash={selected.afterHash} />
          </div>
          <details>
            <summary className="cursor-pointer text-sm font-medium">
              Evaluation history · {reports.length} checkpoints
            </summary>
            <div className="mt-4 space-y-3">
              <label className="flex flex-wrap items-center gap-2 text-sm">
                Opponent
                <select
                  aria-label="Evaluation history opponent"
                  value={opponent}
                  onChange={e => onOpponent(e.target.value)}
                  className={fieldClass}
                >
                  {decks.map(d => (
                    <option key={d.key} value={d.key}>
                      {d.short}
                      {d.key === deck ? ' · policy mirror' : ''}
                    </option>
                  ))}
                </select>
              </label>
              <WinRateChart
                points={points}
                label={`${name(deck)} evaluation against ${name(opponent)}`}
                color={decks.find(d => d.key === deck)?.color ?? '#22c55e'}
              />
              <div className="overflow-x-auto">
                <table
                  className="w-full min-w-[500px] text-left text-xs"
                  aria-label="Evaluation checkpoint history"
                >
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th scope="col" className="p-2">
                        Checkpoint
                      </th>
                      <th scope="col" className="p-2">
                        Held-out choices
                      </th>
                      <th scope="col" className="p-2">
                        vs {name(opponent)}
                      </th>
                      <th scope="col" className="p-2">
                        Model
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.map(r => (
                      <tr key={r.id} className="border-b last:border-0">
                        <th scope="row" className="p-2 font-normal">
                          {r.label}
                        </th>
                        <td className="p-2">
                          {fraction(r.practice.heldout.correct, r.practice.heldout.choices)}
                        </td>
                        <td className="p-2">
                          {percent(r.after[opponent]?.rate)}
                          {r.after[opponent] && ` · ${r.after[opponent]!.games} games`}
                        </td>
                        <td className="p-2">
                          <ModelHash hash={r.afterHash} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </details>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Draws count in the denominator. Mirror results compare policies. Reused development
            seeds do not qualify a production release.
            {rotation &&
              ' The latest sixteen turn reports are shown; earlier reports remain saved locally.'}
          </p>
        </div>
      )}
    </LabSection>
  );
}
