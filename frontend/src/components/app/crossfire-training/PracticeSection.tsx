import { Badge } from '@/components/ui/badge.tsx';
import type { PracticeData, PracticeScores } from './lab-data.ts';
import { fraction, number } from './format.ts';
import { EmptyState, LabSection, ProgressBar } from './LabPrimitives.tsx';

export function PracticeAgreement({
  columns,
}: {
  columns: { label: string; scores: PracticeScores | null }[];
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[480px] text-sm" aria-label="Reference-choice agreement">
        <thead>
          <tr className="border-b text-left text-xs text-muted-foreground">
            <th scope="col" className="pb-3">
              Set
            </th>
            {columns.map(c => (
              <th scope="col" key={c.label} className="p-3 text-right">
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {(['train', 'heldout'] as const).map(split => (
            <tr key={split} className="border-b last:border-0">
              <th scope="row" className="py-3 text-left font-medium">
                {split === 'train' ? 'Training families' : 'Held-out families'}
              </th>
              {columns.map(c => (
                <td key={c.label} className="p-3 text-right tabular-nums">
                  {c.scores ? (
                    <>
                      <strong>{fraction(c.scores[split].correct, c.scores[split].choices)}</strong>
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {number(c.scores[split].correct)}/{number(c.scores[split].choices)} choices
                      </span>
                    </>
                  ) : (
                    '—'
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
export default function PracticeSection({ data, name }: { data: PracticeData; name: string }) {
  const scores = data.latest ?? data.after;
  return (
    <LabSection
      title={`${name} · practice scenarios`}
      description={
        <>
          {data.description} Agreement measures choices along reference sequences; it is not
          autonomous scenario completion or a win rate.
        </>
      }
      actions={data.notice && <Badge variant="outline">{data.notice}</Badge>}
      testId="practice-progress"
    >
      <PracticeAgreement
        columns={[
          { label: data.beforeLabel, scores: data.before },
          { label: data.afterLabel, scores: data.after },
          { label: 'Latest measured', scores: data.latest },
        ]}
      />
      {!scores ? (
        <div className="mt-4">
          <EmptyState>Practice measurements will appear when available.</EmptyState>
        </div>
      ) : (
        <details className="mt-4 text-sm">
          <summary className="cursor-pointer font-medium">
            Per-scenario results · {scores.train.families.length + scores.heldout.families.length}{' '}
            families
          </summary>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {(['train', 'heldout'] as const).flatMap(split =>
              scores[split].families.map(f => (
                <div key={`${split}-${f.id}`} className="space-y-2 rounded-lg border p-3">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-medium">{f.title}</h3>
                    {split === 'heldout' && <Badge variant="outline">Held out</Badge>}
                  </div>
                  <div className="flex justify-between gap-2 text-xs text-muted-foreground">
                    <span>
                      {number(f.correct)}/{number(f.choices)} reference choices
                    </span>
                    <strong>{fraction(f.correct, f.choices)}</strong>
                  </div>
                  {f.choices > 0 && (
                    <ProgressBar
                      label={`${f.title} agreement`}
                      completed={f.correct}
                      target={f.choices}
                    />
                  )}
                </div>
              )),
            )}
          </div>
        </details>
      )}
    </LabSection>
  );
}
