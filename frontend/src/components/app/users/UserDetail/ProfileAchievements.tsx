import { useState, type ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { Pencil, Plus, Trophy } from 'lucide-react';
import { useUserAchievements } from '@/api/user-profile/useUserAchievements.ts';
import { useUpdateUserAchievement } from '@/api/user-profile/useUpdateUserAchievement.ts';
import { useUserTournaments } from '@/api/user/useUserTournaments.ts';
import { useToast } from '@/hooks/use-toast.ts';
import Dialog from '@/components/app/global/Dialog.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Skeleton } from '@/components/ui/skeleton.tsx';
import { cn } from '@/lib/utils.ts';
import { getTournamentTypeLogo } from '@/lib/tournamentTypeLogo.ts';
import type {
  UserAchievement,
  UserAchievementInput,
} from '../../../../../../types/UserAchievements.ts';

const tileClassName =
  'relative flex min-h-28 w-44 max-w-full flex-col justify-center rounded-md border border-border bg-muted p-3';
const focusClassName = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

function AchievementContent({
  result,
}: {
  result: Pick<UserAchievement, 'name' | 'type' | 'typeName' | 'placement' | 'attendance'>;
}) {
  const logo = getTournamentTypeLogo(result.type);
  return (
    <>
      <span
        className="mb-2 block line-clamp-2 text-xs leading-tight font-medium"
        title={result.name}
      >
        {result.name}
      </span>
      <span className="flex items-center justify-center gap-3">
        {logo ? (
          <img
            src={logo}
            alt={result.typeName}
            width={48}
            height={48}
            className="size-12 shrink-0 object-contain"
            draggable={false}
          />
        ) : (
          <Trophy className="size-10 shrink-0 text-muted-foreground" aria-hidden="true" />
        )}
        <span className="min-w-0 text-center">
          <span
            className={cn(
              'block whitespace-nowrap leading-none font-semibold tabular-nums',
              result.placement < 1000 ? 'text-3xl' : 'text-2xl',
            )}
          >
            #{result.placement}
          </span>
          <span className="mt-1 block text-xs text-muted-foreground">
            {result.attendance} players
          </span>
        </span>
      </span>
    </>
  );
}

function AchievementPicker({
  userId,
  selected,
  onSelect,
  onNavigate,
  usedTournamentIds,
  pending,
}: {
  userId: string;
  selected: string | null;
  onSelect: (id: string) => void;
  onNavigate: () => void;
  usedTournamentIds: Set<string>;
  pending: boolean;
}) {
  const query = useUserTournaments(userId);
  const [search, setSearch] = useState('');
  if (query.isPending) return <p role="status">Loading tournament results…</p>;
  if (query.isError)
    return (
      <div role="alert" className="space-y-2">
        <p className="text-sm">{query.error.message}</p>
        <Button variant="outline" onClick={() => void query.refetch()}>
          Try again
        </Button>
      </div>
    );
  const eligible = query.data.tournaments.filter(
    row =>
      row.completed && row.placement !== null && row.placement > 0 && row.tournamentId !== null,
  );
  const results = eligible.filter(row =>
    `${row.name} ${row.typeName ?? ''}`.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <div className="space-y-3">
      <Input
        aria-label="Search achievement results"
        placeholder="Search tournament results…"
        value={search}
        onChange={event => setSearch(event.target.value)}
      />
      {eligible.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No completed results with a placement yet.{' '}
          <Link
            to="/users/$userId"
            params={{ userId }}
            search={previous => ({ ...previous, userTab: 'tournaments' })}
            onClick={onNavigate}
            className="text-primary underline underline-offset-2"
          >
            Refresh your results on the Tournaments tab.
          </Link>
        </p>
      ) : results.length === 0 ? (
        <p className="text-sm text-muted-foreground">No matching tournament results.</p>
      ) : (
        <div
          role="group"
          aria-label="Tournament results"
          className="grid grid-cols-1 gap-2 sm:grid-cols-2"
        >
          {results.map(row => {
            const used = usedTournamentIds.has(row.tournamentId!);
            return (
              <button
                key={row.tournamentId}
                type="button"
                aria-label={`${row.name}: #${row.placement} of ${row.attendance}${used ? ' (already showcased)' : ''}`}
                aria-pressed={selected === row.tournamentId}
                disabled={pending || used}
                onClick={() => onSelect(row.tournamentId!)}
                className={cn(
                  tileClassName,
                  focusClassName,
                  'w-full text-left transition-colors hover:border-primary disabled:opacity-50',
                  selected === row.tournamentId && 'border-primary ring-1 ring-primary',
                )}
              >
                <AchievementContent
                  result={{
                    ...row,
                    placement: row.placement!,
                    type: row.type ?? '',
                    typeName: row.typeName ?? 'Tournament',
                  }}
                />
                <span className="mt-2 text-xs text-muted-foreground">
                  {used ? 'Already showcased' : new Date(row.date).toLocaleDateString()}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function AchievementDialog({
  userId,
  slot,
  result,
  connected,
  achievements,
  trigger,
  pending,
  save,
}: {
  userId: string;
  slot: number;
  result?: UserAchievement;
  connected: boolean;
  achievements: UserAchievement[];
  trigger: ReactNode;
  pending: boolean;
  save: (input: UserAchievementInput) => Promise<boolean>;
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(result?.tournamentId ?? null);
  return (
    <Dialog
      trigger={trigger}
      open={open}
      onOpenChange={next => {
        if (pending) return;
        if (next) setSelected(result?.tournamentId ?? null);
        setOpen(next);
      }}
      header="Showcase an achievement"
      headerDescription="Choose a completed tournament result to display beside your profile name."
      size="medium"
      contentClassName="w-[calc(100vw-2rem)] sm:max-w-xl!"
      footer={
        <div className="flex w-full justify-between gap-2">
          <Button variant="ghost" disabled={pending || !selected} onClick={() => setSelected(null)}>
            Clear
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" disabled={pending} onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={
                pending ||
                selected === (result?.tournamentId ?? null) ||
                (!connected && selected !== null)
              }
              onClick={async () => {
                if (await save({ slot, tournamentId: selected })) setOpen(false);
              }}
            >
              {pending ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </div>
      }
    >
      {open &&
        (connected ? (
          <AchievementPicker
            userId={userId}
            selected={selected}
            onSelect={setSelected}
            onNavigate={() => setOpen(false)}
            usedTournamentIds={
              new Set(achievements.filter(row => row.slot !== slot).map(row => row.tournamentId))
            }
            pending={pending}
          />
        ) : (
          <div className="space-y-4 py-3">
            <p className="text-sm text-muted-foreground">
              Connect your Melee account to showcase your tournament results.
            </p>
            <Button asChild variant="outline">
              <Link to="/settings" search={previous => ({ ...previous, page: 'integrations' })}>
                Connect Melee account
              </Link>
            </Button>
          </div>
        ))}
    </Dialog>
  );
}

export function ProfileAchievements({ userId, canEdit }: { userId: string; canEdit: boolean }) {
  const query = useUserAchievements(userId);
  const mutation = useUpdateUserAchievement(userId);
  const { toast } = useToast();
  if (query.isPending)
    return <Skeleton className="ml-auto h-28 w-44 max-w-full" aria-label="Loading achievements" />;
  if (query.isError)
    return (
      <div role="alert" className="ml-auto max-w-full text-right text-sm text-muted-foreground">
        Could not load achievements.{' '}
        <Button variant="ghost" onClick={() => void query.refetch()}>
          Try again
        </Button>
      </div>
    );
  const { achievements, achievementLimit, connected } = query.data;
  if (!canEdit && achievements.length === 0) return null;
  const slots = canEdit
    ? Array.from({ length: achievementLimit }, (_, i) => i + 1)
    : achievements.map(row => row.slot);
  if (slots.length === 0) return null;
  const save = async (input: UserAchievementInput) => {
    try {
      await mutation.mutateAsync(input);
      return true;
    } catch (error) {
      toast({
        title: 'Could not save achievement',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
      return false;
    }
  };
  return (
    <div
      role="group"
      aria-label="Player achievements"
      aria-busy={mutation.isPending}
      className="ml-auto flex w-full min-w-0 flex-wrap justify-end gap-3 @[761px]/main-body:w-auto @[761px]/main-body:max-w-[60%]"
    >
      {slots.map(slot => {
        const result = achievements.find(row => row.slot === slot);
        return (
          <div key={slot} className="max-w-full">
            {canEdit ? (
              <AchievementDialog
                userId={userId}
                slot={slot}
                result={result}
                achievements={achievements}
                connected={connected}
                pending={mutation.isPending}
                save={save}
                trigger={
                  <button
                    type="button"
                    aria-label={
                      result
                        ? `Edit achievement ${slot}: ${result.name}`
                        : `Add achievement ${slot}`
                    }
                    disabled={mutation.isPending}
                    className={cn(
                      tileClassName,
                      focusClassName,
                      'text-left transition-colors hover:border-primary disabled:opacity-50',
                      !result &&
                        'items-center gap-2 border-dashed border-muted-foreground/40 bg-[repeating-linear-gradient(135deg,transparent,transparent_6px,hsl(var(--muted)/0.45)_6px,hsl(var(--muted)/0.45)_7px)]',
                    )}
                  >
                    {result ? (
                      <>
                        <AchievementContent result={result} />
                        <Pencil
                          className="pointer-events-none absolute top-2 right-2 z-10 size-3.5 text-muted-foreground"
                          aria-hidden="true"
                        />
                      </>
                    ) : (
                      <>
                        <Plus className="size-5 text-muted-foreground" aria-hidden="true" />
                        <span className="text-xs text-muted-foreground">Add achievement</span>
                      </>
                    )}
                  </button>
                }
              />
            ) : (
              result && (
                <Link
                  to="/tournaments/$tournamentId"
                  params={{ tournamentId: result.tournamentId }}
                  aria-label={`${result.name}: #${result.placement} of ${result.attendance}`}
                  className={cn(
                    tileClassName,
                    focusClassName,
                    'transition-colors hover:bg-muted/70',
                  )}
                >
                  <AchievementContent result={result} />
                </Link>
              )
            )}
          </div>
        );
      })}
    </div>
  );
}
