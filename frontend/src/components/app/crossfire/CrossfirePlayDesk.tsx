import type { CrossfireLobby } from '../../../../../shared/types/crossfire.ts';
import type { InviteControls } from './InvitationSidebar.tsx';
import { useJoinLobby } from '@/api/crossfire/useJoinLobby.ts';
import { useBattlefieldEditor } from '@/api/battlefield/useBattlefield.ts';
import { BattlefieldPicker } from './BattlefieldPicker.tsx';
import { useEffect, useId, useState, type ReactNode } from 'react';
import { useForm } from '@tanstack/react-form';
import { useStore } from '@tanstack/react-store';
import { useNavigate } from '@tanstack/react-router';
import { ArrowRight, CheckCircle2, Link2, LoaderCircle, Swords, UserRound, X } from 'lucide-react';
import { useCardList } from '@/api/lists/useCardList.ts';
import { useCrossfireDeck, useCrossfireDecks } from '@/api/crossfire/useCrossfireDecks.ts';
import { useDeckReadiness } from '@/api/crossfire/useDeckReadiness.ts';
import { useCreateLobby } from '@/api/crossfire/useCreateLobby.ts';
import { Button } from '@/components/ui/button.tsx';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group.tsx';
import { Checkbox } from '@/components/ui/checkbox.tsx';
import { DeckBrowser } from './DeckBrowser.tsx';
import { LeaderBaseArtwork } from '@/components/app/global/LeaderBaseArtwork.tsx';
import { crossfireHomeStyles as styles } from './crossfireHomeStyles.ts';
import { deckCardName } from './presentation.ts';
import { DeckCheckDialog } from './DeckCheckDialog.tsx';
import { crossfireError, linkedId } from './presentation.ts';
import { cn } from '@/lib/utils.ts';

export function CrossfirePlayDesk({
  sessionId,
  initialDeck,
  lobby,
  renderAside,
}: {
  sessionId: string;
  initialDeck?: string;
  lobby?: CrossfireLobby;
  renderAside: (controls: InviteControls) => ReactNode;
}) {
  const navigate = useNavigate();
  const create = useCreateLobby(sessionId);
  const join = useJoinLobby(sessionId, lobby?.id ?? '');
  const pending = create.isPending || join.isPending;
  const { data: catalog } = useCardList();
  const battlefields = useBattlefieldEditor();
  const matchLengthId = useId();
  const [recipient, setRecipient] = useState<Parameters<InviteControls['invite']>[0]>();
  const [linked, setLinked] = useState(Boolean(linkedId(initialDeck ?? '', 'decks')));
  const form = useForm({
    defaultValues: {
      deckId: linkedId(initialDeck ?? '', 'decks') ?? '',
      bestOfThree: (lobby?.bestOf ?? 3) === 3,
      allowSpectators: lobby?.policy.allowSpectators ?? true,
      handsToSpectators: lobby?.policy.handsToSpectators ?? true,
      showLeader: lobby?.showLeader ?? true,
      battlefieldId: '',
    },
    onSubmit: async () => {
      await start(recipient?.id);
    },
  });
  const values = useStore(form.store, s => s.values);
  const choices = battlefields.data?.battlefields ?? [];
  const battlefieldId =
    choices.find(b => b.id === values.battlefieldId)?.id ??
    choices.find(b => b.active)?.id ??
    choices[0]?.id;
  const selectedId = values.deckId || undefined;
  const recent = useCrossfireDecks(sessionId, 'recent', '', !lobby && !selectedId);
  const recentDeckId = recent.data?.pages[0]?.data[0]?.id;
  const own = useCrossfireDecks(
    sessionId,
    'mine',
    '',
    !lobby && !selectedId && recent.isSuccess && !recentDeckId,
  );
  const defaultDeckId =
    recentDeckId ?? (recent.isSuccess ? own.data?.pages[0]?.data[0]?.id : undefined);
  useEffect(() => {
    // Hosts get an initial suggestion; invitees explicitly choose their matchup.
    // A late result must never replace a manual or pasted selection.
    if (!lobby && defaultDeckId && !form.getFieldValue('deckId'))
      form.setFieldValue('deckId', defaultDeckId);
  }, [defaultDeckId, form, lobby]);
  const selected = useCrossfireDeck(sessionId, selectedId);
  const readiness = useDeckReadiness(sessionId, selectedId);
  const deckReady = Boolean(selectedId && readiness.data?.ready && !readiness.isError);
  const canSubmit = deckReady && !readiness.isFetching && !pending && !battlefields.isPending;
  const start = async (recipientId?: string) => {
    if (!canSubmit) return;
    try {
      if (lobby) {
        const joined = await join.mutateAsync({
          deckId: values.deckId,
          acceptedPolicy: lobby.policy,
          acceptedBestOf: lobby.bestOf ?? 1,
          battlefieldId,
        });
        await navigate({ to: '/crossfire/$lobbyId', params: { lobbyId: joined.id } });
      } else {
        const created = await create.mutateAsync({
          deckId: values.deckId,
          bestOf: values.bestOfThree ? 3 : 1,
          showLeader: values.showLeader,
          recipientId,
          battlefieldId,
          policy: {
            allowSpectators: values.allowSpectators,
            handsToPlayers: false,
            handsToSpectators: values.allowSpectators && values.handsToSpectators,
          },
        });
        await navigate({
          to: '/crossfire',
          search: { cfInvite: created.id, cfDeck: values.deckId },
        });
      }
    } catch {
      /* The mutation owns the visible error. */
    }
  };
  const selectDeck = (id: string, fromLink = false) => {
    setLinked(fromLink);
    form.setFieldValue('deckId', id);
    create.reset();
    join.reset();
  };
  return (
    <div className={lobby ? 'cf-home-grid min-w-0' : styles.layout}>
      <section className={styles.desk} aria-label="Start a game">
        {!lobby && (
          <div className={styles.deskHeader}>
            <span className={styles.icon}>
              <Swords className="size-4" />
            </span>
            <div>
              <h2 className={styles.heading}>Set up your next game</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Choose a deck, set the match, then invite an opponent.
              </p>
            </div>
          </div>
        )}
        <div className={styles.deskBody}>
          <DeckBrowser
            sessionId={sessionId}
            selected={selectedId}
            disabled={pending}
            onSelect={selectDeck}
            linked={linked}
            selectedDeck={selected.data}
            selectedStatus={selected.isError ? 'Deck unavailable' : 'Loading deck…'}
            onSelectLink={id => selectDeck(id, true)}
            invitationStep={
              !lobby
                ? undefined
                : !selectedId
                  ? 'choose'
                  : deckReady
                    ? 'complete'
                    : readiness.isFetching
                      ? 'checking'
                      : readiness.isError
                        ? 'error'
                        : 'attention'
            }
          />
          <form
            className={styles.preview}
            onSubmit={e => {
              e.preventDefault();
              void form.handleSubmit();
            }}
          >
            <div className={styles.launch}>
              {lobby && (
                <div
                  className="flex items-center gap-3"
                  aria-current={deckReady ? 'step' : undefined}
                >
                  <span
                    className={cn(
                      styles.stepBadge,
                      deckReady && 'border-primary bg-primary text-primary-foreground',
                    )}
                    aria-hidden
                  >
                    2
                  </span>
                  <div>
                    <h2 className={styles.heading}>Review and play</h2>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Game settings are set by your opponent.
                    </p>
                  </div>
                </div>
              )}
              <div className={styles.selected}>
                <div className={styles.selectedCopy} aria-live="polite">
                  <span className={styles.eyebrow}>
                    {selectedId ? 'Selected deck' : 'Your next game'}
                  </span>
                  <strong>
                    {selectedId
                      ? selected.isPending
                        ? 'Loading deck…'
                        : selected.data?.name ||
                          (selected.isError ? 'Deck unavailable' : 'Untitled deck')
                      : !lobby && (recent.isFetching || own.isFetching)
                        ? 'Finding your last deck…'
                        : 'Choose a deck to begin.'}
                  </strong>
                  <small>
                    {selected.data
                      ? `${deckCardName(catalog?.cards, selected.data.leaderId) || 'No leader'} · ${deckCardName(catalog?.cards, selected.data.baseId) || 'No base'}`
                      : 'Choose from the deck browser or use a shared link.'}
                  </small>
                </div>
                <LeaderBaseArtwork
                  leaderId={selected.data?.leaderId}
                  baseKey={selected.data?.baseId}
                  size="compact"
                  className="cf-selected-art"
                />
              </div>
              {!lobby && !selectedId && (recent.isError || own.isError) && (
                <div role="alert" className="text-xs text-muted-foreground">
                  Could not find your last deck. Choose one from the browser or try again.
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => void (recent.isError ? recent.refetch() : own.refetch())}
                  >
                    Try again
                  </Button>
                </div>
              )}
              {selectedId && (
                <div className="cf-deck-readiness -mt-2 text-xs" aria-live="polite">
                  {readiness.isFetching ? (
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <LoaderCircle className="size-3.5 animate-spin motion-reduce:animate-none" />
                      Checking this deck…
                    </span>
                  ) : readiness.isError ? (
                    <div role="alert">
                      <p>{crossfireError(readiness.error)}</p>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => void readiness.refetch()}
                      >
                        Check again
                      </Button>
                    </div>
                  ) : readiness.data?.ready ? (
                    <span className="cf-deck-ready flex items-center gap-2 text-primary">
                      <CheckCircle2 size={14} />
                      Ready for Crossfire practice.
                    </span>
                  ) : null}
                </div>
              )}
              <BattlefieldPicker
                battlefields={choices}
                value={battlefieldId}
                onChange={id => form.setFieldValue('battlefieldId', id)}
                disabled={pending}
              />
              {battlefields.isError && (
                <p className="text-xs text-muted-foreground">
                  Could not load battlefield choices. Your current battlefield will be used.
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => void battlefields.refetch()}
                  >
                    Try again
                  </Button>
                </p>
              )}
              {lobby ? (
                <section
                  aria-label="Invitation settings"
                  className="space-y-2 rounded-xl border border-[color:var(--workspace-border)] bg-card p-3"
                >
                  <p className="flex items-center gap-2 text-xs font-semibold">
                    <Swords className="size-3.5 text-primary" aria-hidden />
                    Best of {lobby.bestOf ?? 1}
                    <span className="ml-auto text-[11px] font-normal text-muted-foreground">
                      {lobby.bestOf === 3 ? 'With sideboarding' : 'One game'}
                    </span>
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {lobby.policy.allowSpectators
                      ? `Spectators can join with the invitation link. ${lobby.policy.handsToSpectators ? 'They can see both hands.' : 'Hands stay hidden from them.'}`
                      : 'Spectators are disabled.'}
                  </p>
                  {lobby.policy.handsToPlayers && (
                    <p className="text-[11px] text-muted-foreground">
                      Both players’ hands will be revealed.
                    </p>
                  )}
                </section>
              ) : (
                <fieldset disabled={pending} className={styles.settings}>
                  <legend className="sr-only">Game settings</legend>
                  <form.Field name="bestOfThree">
                    {field => (
                      <div className="cf-match-format">
                        <span className={styles.heading} id={matchLengthId}>
                          Match length
                        </span>
                        <RadioGroup
                          aria-labelledby={matchLengthId}
                          orientation="horizontal"
                          value={field.state.value ? '3' : '1'}
                          onValueChange={value => field.handleChange(value === '3')}
                          disabled={pending}
                          className={styles.matchLength}
                        >
                          {['1', '3'].map(value => (
                            <label
                              key={value}
                              className={styles.matchOption}
                              htmlFor={`${matchLengthId}-${value}`}
                            >
                              <RadioGroupItem
                                id={`${matchLengthId}-${value}`}
                                value={value}
                                aria-label={`Best of ${value}`}
                                className="sr-only"
                              />
                              <span className="flex items-center justify-between gap-2">
                                Best of {value}
                                <span className="size-2 rounded-full bg-current opacity-25" />
                              </span>
                              <span className="text-[10px] font-normal text-muted-foreground">
                                {value === '3' ? 'With sideboarding' : 'One game'}
                              </span>
                            </label>
                          ))}
                        </RadioGroup>
                        <p className="cf-format-description mt-2 text-[11px] text-muted-foreground">
                          {field.state.value
                            ? 'First to two wins · Sideboarding between games'
                            : 'One game decides the winner'}
                        </p>
                      </div>
                    )}
                  </form.Field>
                  <div className="cf-visibility-options divide-y divide-[color:var(--workspace-border)]">
                    <form.Field name="allowSpectators">
                      {field => (
                        <label className={styles.settingRow}>
                          <Checkbox
                            className="order-2"
                            checked={field.state.value}
                            onCheckedChange={value => field.handleChange(value === true)}
                          />
                          <span>Allow spectators (only with invitation link)</span>
                        </label>
                      )}
                    </form.Field>
                    <form.Field name="handsToSpectators">
                      {field => (
                        <label className={styles.settingRow}>
                          <Checkbox
                            className="order-2"
                            checked={values.allowSpectators && field.state.value}
                            disabled={!values.allowSpectators}
                            onCheckedChange={value => field.handleChange(value === true)}
                          />
                          <span>Let spectators see both hands</span>
                        </label>
                      )}
                    </form.Field>
                    <form.Field name="showLeader">
                      {field => (
                        <label className={styles.settingRow}>
                          <Checkbox
                            className="order-2"
                            checked={field.state.value}
                            onCheckedChange={value => field.handleChange(value === true)}
                          />
                          <span>Show my leader before game</span>
                        </label>
                      )}
                    </form.Field>
                  </div>
                </fieldset>
              )}
              {(create.isError || join.isError) && (
                <p role="alert" className="text-sm text-destructive">
                  {crossfireError(create.error ?? join.error)}
                </p>
              )}
              <div className={styles.launchActions}>
                {!lobby && (
                  <div className="mb-1 flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
                    {recipient ? (
                      <UserRound className="size-3.5 shrink-0" />
                    ) : (
                      <Link2 className="size-3.5 shrink-0" />
                    )}
                    <span className="min-w-0 flex-1 wrap-anywhere">
                      {recipient
                        ? `Inviting ${recipient.name}`
                        : 'Create a link to share with your opponent.'}
                    </span>
                    {recipient && (
                      <Button
                        type="button"
                        size="iconSmall"
                        variant="ghost"
                        aria-label="Clear selected teammate"
                        disabled={pending}
                        onClick={() => setRecipient(undefined)}
                      >
                        <X className="size-3.5" />
                      </Button>
                    )}
                  </div>
                )}
                {selectedId &&
                  readiness.data &&
                  !readiness.data.ready &&
                  !readiness.isFetching &&
                  !readiness.isError && (
                    <DeckCheckDialog issues={readiness.data.issues} catalog={catalog?.cards} />
                  )}
                {lobby && (
                  <p
                    className={cn(
                      'text-xs',
                      deckReady ? 'font-medium text-primary' : 'text-muted-foreground',
                    )}
                  >
                    {pending
                      ? 'Joining your opponent…'
                      : readiness.isFetching
                        ? 'Checking your deck…'
                        : readiness.isError
                          ? 'Couldn’t check this deck. Use Check again to retry.'
                          : deckReady
                            ? 'Your deck is ready. Let’s play.'
                            : selectedId
                              ? 'Check your deck before joining.'
                              : 'Choose a ready deck to continue.'}
                  </p>
                )}
                <Button
                  type="submit"
                  className={cn(
                    styles.launchButton,
                    lobby && 'rounded-xl',
                    lobby &&
                      canSubmit &&
                      'ring-2 ring-primary/40 ring-offset-4 ring-offset-card shadow-lg shadow-primary/15',
                  )}
                  disabled={!canSubmit}
                >
                  <span className="min-w-0">
                    {pending
                      ? 'Preparing game…'
                      : lobby
                        ? 'Accept invitation and play'
                        : recipient
                          ? `Send invitation to ${recipient.name}`
                          : 'Create invitation'}
                  </span>
                  <ArrowRight size={17} />
                </Button>
              </div>
            </div>
          </form>
        </div>
      </section>
      {!lobby &&
        renderAside({
          invite: player => {
            create.reset();
            setRecipient(current =>
              current?.id === player.id ? undefined : { id: player.id, name: player.name },
            );
          },
          selectedPlayerId: recipient?.id,
          canInvite: !lobby && !pending,
          pending,
        })}
    </div>
  );
}
