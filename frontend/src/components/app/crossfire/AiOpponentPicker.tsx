import type { AiOpponents, AiOpponent } from '../../../../../shared/types/crossfire-ai-play.ts';
import { Badge } from '@/components/ui/badge.tsx';
import { Button } from '@/components/ui/button.tsx';
import { trainingStrategies } from '../../../../../shared/types/crossfire-training.ts';

export function AiOpponentPicker({
  data,
  selected,
  onSelect,
  loading,
  error,
  retry,
  disabled,
}: {
  data?: AiOpponents;
  selected?: AiOpponent;
  onSelect: (key: string) => void;
  loading: boolean;
  error: boolean;
  retry: () => void;
  disabled: boolean;
}) {
  return (
    <div className="space-y-3 rounded-lg border p-4" aria-label="AI opponent">
      {loading ? (
        <p role="status">Loading trained opponents…</p>
      ) : error ? (
        <div role="alert">
          <p>Could not load AI opponents.</p>
          <Button type="button" variant="outline" onClick={retry}>
            Try again
          </Button>
        </div>
      ) : !data?.data.length ? (
        <p className="text-sm text-muted-foreground">
          No trained opponents are available yet. Released models appear here when activated by an
          administrator.
        </p>
      ) : (
        <>
          <label className="block space-y-2 text-sm font-medium">
            Opposing deck
            <select
              aria-label="AI opposing deck"
              disabled={disabled}
              value={selected ? `${selected.releaseId}/${selected.deckKey}` : ''}
              onChange={e => onSelect(e.target.value)}
              className="block h-10 w-full min-w-0 rounded-md border bg-background px-3"
            >
              <option value="" disabled>
                Choose a trained deck
              </option>
              {data.data.map(d => (
                <option key={`${d.releaseId}/${d.deckKey}`} value={`${d.releaseId}/${d.deckKey}`}>
                  {d.label}
                </option>
              ))}
            </select>
          </label>
          {selected && (
            <>
              <div className="flex flex-wrap gap-2">
                {selected.archetypes.map(a => (
                  <Badge key={a} variant="secondary">
                    {trainingStrategies.find(s => s.key === a)?.label ?? a}
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                {selected.releaseLabel} · {selected.games.toLocaleString()} training games
              </p>
            </>
          )}
        </>
      )}
      <p className="text-sm text-muted-foreground">
        One game against a trained AI. These games never count toward your player statistics.
      </p>
      {data && (
        <p className="text-xs text-muted-foreground">
          {data.replayLimit === null
            ? 'All AI replays are retained.'
            : `Your latest ${data.replayLimit} completed AI replays are retained. Older results stay in match history.`}
        </p>
      )}
    </div>
  );
}
