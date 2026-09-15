import type { CrossfireLobby } from '../../../../../shared/types/crossfire.ts';
import type { InviteControls } from './InvitationSidebar.tsx';
import { useJoinLobby } from '@/api/crossfire/useJoinLobby.ts';
import { useEffect, useId, useState, type ReactNode } from 'react';
import { useForm } from '@tanstack/react-form';
import { useStore } from '@tanstack/react-store';
import { useNavigate } from '@tanstack/react-router';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { useCardList } from '@/api/lists/useCardList.ts';
import { useCrossfireDeck, useCrossfireDecks } from '@/api/crossfire/useCrossfireDecks.ts';
import { useDeckReadiness } from '@/api/crossfire/useDeckReadiness.ts';
import { useCreateLobby } from '@/api/crossfire/useCreateLobby.ts';
import { Button } from '@/components/ui/button.tsx';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group.tsx';
import { Checkbox } from '@/components/ui/checkbox.tsx';
import { DeckBrowser } from './DeckBrowser.tsx';
import { DeckArtwork } from './DeckArtwork.tsx';
import { deckCardName } from './presentation.ts';
import { DeckCheckDialog } from './DeckCheckDialog.tsx';
import { crossfireError, linkedId } from './presentation.ts';

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
  const matchLengthId = useId();
  const [linked, setLinked] = useState(Boolean(linkedId(initialDeck ?? '', 'decks')));
  const form = useForm({
    defaultValues: {
      deckId: linkedId(initialDeck ?? '', 'decks') ?? '',
      bestOfThree: lobby?.bestOf === 3,
      allowSpectators: lobby?.policy.allowSpectators ?? true,
      handsToPlayers: lobby?.policy.handsToPlayers ?? false,
      handsToSpectators: lobby?.policy.handsToSpectators ?? false,
      showLeader: lobby?.showLeader ?? true,
    },
    onSubmit: async () => {
      await start();
    },
  });
  const values = useStore(form.store, s => s.values);
  const selectedId = values.deckId || undefined;
  const recent = useCrossfireDecks(sessionId, 'recent', '', !selectedId);
  const recentDeckId = recent.data?.pages[0]?.data[0]?.id;
  const own = useCrossfireDecks(
    sessionId,
    'mine',
    '',
    !selectedId && recent.isSuccess && !recentDeckId,
  );
  const defaultDeckId =
    recentDeckId ?? (recent.isSuccess ? own.data?.pages[0]?.data[0]?.id : undefined);
  useEffect(() => {
    // Initial suggestion only: a late result must never replace a manual or pasted selection.
    if (defaultDeckId && !form.getFieldValue('deckId')) form.setFieldValue('deckId', defaultDeckId);
  }, [defaultDeckId, form]);
  const selected = useCrossfireDeck(sessionId, selectedId);
  const readiness = useDeckReadiness(sessionId, selectedId);
  const canSubmit = Boolean(
    selectedId && readiness.data?.ready && !readiness.isFetching && !readiness.isError && !pending,
  );
  const start = async (recipientId?: string) => {
    if (!canSubmit) return;
    try {
      if (lobby) {
        const joined = await join.mutateAsync({
          deckId: values.deckId,
          acceptedPolicy: lobby.policy,
          acceptedBestOf: lobby.bestOf ?? 1,
        });
        await navigate({ to: '/crossfire/$lobbyId', params: { lobbyId: joined.id } });
      } else {
        const created = await create.mutateAsync({
          deckId: values.deckId,
          bestOf: values.bestOfThree ? 3 : 1,
          showLeader: values.showLeader,
          recipientId,
          policy: {
            allowSpectators: values.allowSpectators,
            handsToPlayers: values.handsToPlayers,
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
    <div className="cf-home-grid">
      {renderAside({ invite: id => void start(id), canInvite: canSubmit && !lobby, pending })}
      <section className="cf-play-desk" aria-label="Start a game">
        <DeckBrowser
          sessionId={sessionId}
          selected={selectedId}
          disabled={pending}
          catalog={catalog?.cards}
          onSelect={selectDeck}
          linked={linked}
          selectedDeck={selected.data}
          selectedStatus={selected.isError ? 'Deck unavailable' : 'Loading deck…'}
          onSelectLink={id => selectDeck(id, true)}
        />
        <form
          className="cf-deck-preview"
          onSubmit={e => {
            e.preventDefault();
            void form.handleSubmit();
          }}
        >
          <div className="cf-deck-launch">
            <div className="cf-preview-deck">
              <div className="cf-selected-deck" aria-live="polite">
                <span className="cf-home-eyebrow">
                  {selectedId ? 'Selected deck' : 'Your next game'}
                </span>
                <strong>
                  {selectedId
                    ? selected.isPending
                      ? 'Loading deck…'
                      : selected.data?.name ||
                        (selected.isError ? 'Deck unavailable' : 'Untitled deck')
                    : recent.isFetching || own.isFetching
                      ? 'Finding your last deck…'
                      : 'Choose a deck to begin.'}
                </strong>
                <small>
                  {selected.data
                    ? `${deckCardName(catalog?.cards, selected.data.leaderId) || 'No leader'} · ${deckCardName(catalog?.cards, selected.data.baseId) || 'No base'}`
                    : 'Choose from the deck browser or use a shared link.'}
                </small>
              </div>
              <DeckArtwork
                cardId={selected.data?.leaderId}
                catalog={catalog?.cards}
                className="cf-selected-art"
              />
            </div>
            {!selectedId && (recent.isError || own.isError) && (
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
              <div className="cf-deck-readiness" aria-live="polite">
                {readiness.isFetching ? (
                  <span>Checking this deck…</span>
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
                  <span className="cf-deck-ready">
                    <CheckCircle2 size={14} />
                    Ready for Crossfire practice.
                  </span>
                ) : null}
              </div>
            )}
            <fieldset disabled={pending || Boolean(lobby)} className="cf-inline-settings">
              <legend className="sr-only">Game settings</legend>
              <form.Field name="bestOfThree">
                {field => (
                  <div className="cf-match-format">
                    <span className="sr-only" id={matchLengthId}>
                      Match length
                    </span>
                    <RadioGroup
                      aria-labelledby={matchLengthId}
                      orientation="horizontal"
                      value={field.state.value ? '3' : '1'}
                      onValueChange={value => field.handleChange(value === '3')}
                      disabled={pending || Boolean(lobby)}
                      className="cf-match-length"
                    >
                      {['1', '3'].map(value => (
                        <label
                          key={value}
                          className="cf-match-option"
                          htmlFor={`${matchLengthId}-${value}`}
                        >
                          <RadioGroupItem
                            id={`${matchLengthId}-${value}`}
                            value={value}
                            className="sr-only"
                          />
                          Best of {value}
                        </label>
                      ))}
                    </RadioGroup>
                    <p className="cf-format-description">
                      {field.state.value
                        ? 'First to two wins · Sideboarding between games'
                        : 'One game decides the winner'}
                    </p>
                  </div>
                )}
              </form.Field>
              <div className="cf-visibility-options">
                <form.Field name="allowSpectators">
                  {field => (
                    <label className="cf-setting-row">
                      <Checkbox
                        checked={field.state.value}
                        onCheckedChange={value => field.handleChange(value === true)}
                      />
                      <span>Allow spectators (only with invitation link)</span>
                    </label>
                  )}
                </form.Field>
                <form.Field name="handsToPlayers">
                  {field => (
                    <label className="cf-setting-row">
                      <Checkbox
                        checked={field.state.value}
                        onCheckedChange={value => field.handleChange(value === true)}
                      />
                      <span>Play with open hands</span>
                    </label>
                  )}
                </form.Field>
                <form.Field name="handsToSpectators">
                  {field => (
                    <label className="cf-setting-row">
                      <Checkbox
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
                    <label className="cf-setting-row">
                      <Checkbox
                        checked={field.state.value}
                        onCheckedChange={value => field.handleChange(value === true)}
                      />
                      <span>Show my leader before game</span>
                    </label>
                  )}
                </form.Field>
              </div>
            </fieldset>
            {(create.isError || join.isError) && (
              <p role="alert" className="text-sm text-destructive">
                {crossfireError(create.error ?? join.error)}
              </p>
            )}
            <div className="cf-launch-actions">
              {selectedId &&
                readiness.data &&
                !readiness.data.ready &&
                !readiness.isFetching &&
                !readiness.isError && (
                  <DeckCheckDialog issues={readiness.data.issues} catalog={catalog?.cards} />
                )}
              <Button type="submit" className="cf-create-invitation" disabled={!canSubmit}>
                {pending
                  ? 'Preparing game…'
                  : lobby
                    ? 'Accept invitation and play'
                    : 'Create invitation'}
                <ArrowRight size={17} />
              </Button>
            </div>
          </div>
        </form>
      </section>
    </div>
  );
}
